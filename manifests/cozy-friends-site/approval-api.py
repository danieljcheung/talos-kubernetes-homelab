#!/usr/bin/env python3
"""Small, dependency-light username approval API for Cozy Friends."""

from __future__ import annotations

import hmac
import json
import os
import re
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Lock
from time import monotonic
from typing import Any
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

import psycopg
from psycopg.rows import dict_row

from minecraft_status import MinecraftStatusError, fetch_status

TURNSTILE_SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


DATABASE_URL = os.environ.get("DATABASE_URL", "")
ADMIN_TOKEN = os.environ.get("APPROVAL_ADMIN_TOKEN", "")
SYNC_TOKEN = os.environ.get("APPROVAL_SYNC_TOKEN", "")
TURNSTILE_SECRET_KEY = os.environ.get("TURNSTILE_SECRET_KEY", "")
TURNSTILE_EXPECTED_HOSTNAME = os.environ.get("TURNSTILE_EXPECTED_HOSTNAME", "")
MINECRAFT_STATUS_HOST = os.environ.get(
    "MINECRAFT_STATUS_HOST",
    "homestead-headless.cozy-friends.svc.cluster.local",
)
MINECRAFT_STATUS_PORT = int(os.environ.get("MINECRAFT_STATUS_PORT", "25565"))
MINECRAFT_STATUS_TIMEOUT = float(os.environ.get("MINECRAFT_STATUS_TIMEOUT", "2"))
MINECRAFT_STATUS_CACHE_SECONDS = 10.0
PORT = int(os.environ.get("PORT", "8080"))
USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9_]{3,16}$")
MAX_NAME_LENGTH = 80
MAX_BODY_LENGTH = 4096

_minecraft_status_cache: tuple[float, dict[str, Any]] | None = None
_minecraft_status_cache_lock = Lock()



SCHEMA = """
CREATE TABLE IF NOT EXISTS username_submissions (
    id BIGSERIAL PRIMARY KEY,
    requester_name TEXT NOT NULL
        CONSTRAINT username_submissions_requester_name_length
        CHECK (char_length(requester_name) BETWEEN 1 AND 80),
    username TEXT NOT NULL,
    username_key TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    submitted_at TIMESTAMPTZ NOT NULL,
    decided_at TIMESTAMPTZ
)
"""


MIGRATION_STATEMENTS = (
    # Existing deployments predate requester_name; backfill before enforcing NOT NULL.
    "ALTER TABLE username_submissions ADD COLUMN IF NOT EXISTS requester_name TEXT",
    "UPDATE username_submissions SET requester_name = 'Legacy requester' "
    "WHERE requester_name IS NULL",
    """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conrelid = 'username_submissions'::regclass
              AND conname = 'username_submissions_requester_name_length'
        ) THEN
            ALTER TABLE username_submissions
                ADD CONSTRAINT username_submissions_requester_name_length
                CHECK (char_length(requester_name) BETWEEN 1 AND 80) NOT VALID;
        END IF;
    END
    $$;
    """,
    "ALTER TABLE username_submissions ALTER COLUMN requester_name SET NOT NULL",
    "ALTER TABLE username_submissions ALTER COLUMN requester_name DROP DEFAULT",
)


INDEX = """
CREATE INDEX IF NOT EXISTS username_submissions_status_idx
ON username_submissions(status, submitted_at)
"""


def utc_now() -> datetime:
    return datetime.now(timezone.utc)
def get_minecraft_status() -> dict[str, Any]:
    global _minecraft_status_cache

    now = monotonic()
    with _minecraft_status_cache_lock:
        if (
            _minecraft_status_cache is not None
            and now - _minecraft_status_cache[0] < MINECRAFT_STATUS_CACHE_SECONDS
        ):
            return dict(_minecraft_status_cache[1])

    players = fetch_status(
        MINECRAFT_STATUS_HOST,
        MINECRAFT_STATUS_PORT,
        timeout=MINECRAFT_STATUS_TIMEOUT,
    )
    payload = {
        "online": True,
        **players,
        "checkedAt": utc_now().isoformat(),
    }
    with _minecraft_status_cache_lock:
        _minecraft_status_cache = (monotonic(), payload)
    return dict(payload)


def unavailable_minecraft_status() -> dict[str, Any]:
    return {"online": False, "error": "Server status unavailable"}




def connect() -> psycopg.Connection:
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is required")
    return psycopg.connect(DATABASE_URL, row_factory=dict_row, connect_timeout=5)


def initialize_database() -> None:
    with connect() as connection:
        connection.execute(SCHEMA)
        for statement in MIGRATION_STATEMENTS:
            connection.execute(statement)
        connection.execute(INDEX)


def verify_turnstile(token: str) -> bool:
    if not TURNSTILE_SECRET_KEY:
        return False
    payload = urlencode(
        {"secret": TURNSTILE_SECRET_KEY, "response": token},
    ).encode("utf-8")
    request = Request(
        TURNSTILE_SITEVERIFY_URL,
        data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=5) as response:
            result = json.loads(response.read())
    except Exception:
        # A Siteverify outage must never bypass captcha verification.
        return False
    if not isinstance(result, dict) or result.get("success") is not True:
        return False
    return (
        not TURNSTILE_EXPECTED_HOSTNAME
        or result.get("hostname") == TURNSTILE_EXPECTED_HOSTNAME
    )


def row_to_dict(row: dict[str, Any]) -> dict[str, Any]:
    def iso(value: Any) -> str | None:
        return value.isoformat() if value is not None else None

    requester_name = row.get("requester_name", "Legacy requester")
    return {
        "id": row["id"],
        "name": requester_name,
        "requesterName": requester_name,
        "username": row["username"],
        "status": row["status"],
        "submittedAt": iso(row["submitted_at"]),
        "decidedAt": iso(row["decided_at"]),
    }


class ApprovalHandler(BaseHTTPRequestHandler):
    server_version = "CozyFriendsApproval/1.0"

    def log_message(self, format: str, *args: object) -> None:
        # Keep request logging useful without ever logging authorization headers or bodies.
        super().log_message("%s", format % args)

    def send_json(self, status: int, payload: Any) -> None:
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_text(self, status: int, body: str, content_type: str = "text/plain; charset=utf-8") -> None:
        encoded = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def authorize(self, expected: str) -> bool:
        authorization = self.headers.get("Authorization", "")
        return bool(expected) and hmac.compare_digest(authorization, f"Bearer {expected}")

    def read_json(self) -> dict[str, Any] | None:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return None
        if length <= 0 or length > MAX_BODY_LENGTH:
            return None
        try:
            parsed = json.loads(self.rfile.read(length))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return None
        return parsed if isinstance(parsed, dict) else None

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if path == "/healthz":
            self.send_json(HTTPStatus.OK, {"status": "ok"})
            return
        if path == "/healthz/readiness":
            try:
                with connect() as connection:
                    connection.execute("SELECT 1")
            except Exception:
                self.send_json(HTTPStatus.SERVICE_UNAVAILABLE, {"status": "database unavailable"})
                return
            self.send_json(HTTPStatus.OK, {"status": "ready"})
            return
        if path == "/api/minecraft/status":
            try:
                self.send_json(HTTPStatus.OK, get_minecraft_status())
            except (MinecraftStatusError, OSError, TimeoutError):
                self.send_json(HTTPStatus.SERVICE_UNAVAILABLE, unavailable_minecraft_status())
            return
        if path == "/api/whitelist/approved.txt":
            if not self.authorize(SYNC_TOKEN):
                self.send_json(HTTPStatus.UNAUTHORIZED, {"error": "unauthorized"})
                return
            with connect() as connection:
                rows = connection.execute(
                    "SELECT username FROM username_submissions "
                    "WHERE status = 'approved' ORDER BY username_key"
                ).fetchall()
            self.send_text(HTTPStatus.OK, "".join(f"{row['username']}\n" for row in rows))
            return
        if path == "/api/admin/submissions":
            if not self.authorize(ADMIN_TOKEN):
                self.send_json(HTTPStatus.UNAUTHORIZED, {"error": "unauthorized"})
                return
            with connect() as connection:
                rows = connection.execute(
                    "SELECT id, requester_name, username, status, submitted_at, decided_at "
                    "FROM username_submissions ORDER BY submitted_at DESC"
                ).fetchall()
            self.send_json(HTTPStatus.OK, [row_to_dict(row) for row in rows])
            return
        self.send_json(HTTPStatus.NOT_FOUND, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if path == "/api/usernames":
            self.submit_username()
            return
        action_match = re.fullmatch(r"/api/admin/submissions/(\d+)/(approve|reject)", path)
        if action_match:
            self.decide_submission(int(action_match.group(1)), action_match.group(2))
            return
        self.send_json(HTTPStatus.NOT_FOUND, {"error": "not found"})

    def submit_username(self) -> None:
        payload = self.read_json()
        name = payload.get("name", "") if payload else ""
        if not isinstance(name, str):
            name = ""
        name = name.strip()
        if not 1 <= len(name) <= MAX_NAME_LENGTH:
            self.send_json(
                HTTPStatus.BAD_REQUEST,
                {"error": "Enter your name: 1–80 characters."},
            )
            return

        username = payload.get("username", "") if payload else ""
        if not isinstance(username, str):
            username = ""
        username = username.strip()
        if not USERNAME_PATTERN.fullmatch(username):
            self.send_json(
                HTTPStatus.BAD_REQUEST,
                {"error": "Use the exact Java username: 3–16 letters, numbers, or underscores."},
            )
            return

        turnstile_token = payload.get("turnstileToken", "") if payload else ""
        if not isinstance(turnstile_token, str) or not turnstile_token.strip():
            self.send_json(
                HTTPStatus.BAD_REQUEST,
                {"error": "Turnstile verification is required."},
            )
            return
        if not verify_turnstile(turnstile_token.strip()):
            self.send_json(
                HTTPStatus.FORBIDDEN,
                {"error": "Turnstile verification failed."},
            )
            return

        username_key = username.casefold()
        submitted_at = utc_now()
        with connect() as connection:
            inserted = connection.execute(
                "INSERT INTO username_submissions "
                "(requester_name, username, username_key, status, submitted_at) "
                "VALUES (%s, %s, %s, 'pending', %s) "
                "ON CONFLICT (username_key) DO NOTHING RETURNING id",
                (name, username, username_key, submitted_at),
            ).fetchone()
            if inserted is not None:
                submission_id = inserted["id"]
                status = "pending"
                created = True
            else:
                existing = connection.execute(
                    "SELECT id, status FROM username_submissions WHERE username_key = %s",
                    (username_key,),
                ).fetchone()
                if existing is None:
                    raise RuntimeError("username submission disappeared during insert")
                if existing["status"] == "rejected":
                    connection.execute(
                        "UPDATE username_submissions SET requester_name = %s, username = %s, "
                        "status = 'pending', submitted_at = %s, decided_at = NULL WHERE id = %s",
                        (name, username, submitted_at, existing["id"]),
                    )
                    status = "pending"
                else:
                    status = existing["status"]
                submission_id = existing["id"]
                created = False
        self.send_json(
            HTTPStatus.CREATED if created else HTTPStatus.OK,
            {"id": submission_id, "status": status},
        )

    def decide_submission(self, submission_id: int, decision: str) -> None:
        if not self.authorize(ADMIN_TOKEN):
            self.send_json(HTTPStatus.UNAUTHORIZED, {"error": "unauthorized"})
            return
        with connect() as connection:
            row = connection.execute(
                "SELECT id, requester_name, username, status, submitted_at, decided_at "
                "FROM username_submissions WHERE id = %s",
                (submission_id,),
            ).fetchone()
            if row is None:
                self.send_json(HTTPStatus.NOT_FOUND, {"error": "submission not found"})
                return
            if row["status"] != "pending":
                self.send_json(HTTPStatus.CONFLICT, {"error": "submission already decided"})
                return
            status = "approved" if decision == "approve" else "rejected"
            updated = connection.execute(
                "UPDATE username_submissions SET status = %s, decided_at = %s "
                "WHERE id = %s RETURNING id, requester_name, username, status, submitted_at, decided_at",
                (status, utc_now(), submission_id),
            ).fetchone()
        self.send_json(HTTPStatus.OK, row_to_dict(updated))


def main() -> None:
    initialize_database()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), ApprovalHandler)
    print(f"Cozy Friends approval API listening on :{PORT}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
