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
from typing import Any
from urllib.parse import urlparse

import psycopg
from psycopg.rows import dict_row

DATABASE_URL = os.environ.get("DATABASE_URL", "")
ADMIN_TOKEN = os.environ.get("APPROVAL_ADMIN_TOKEN", "")
SYNC_TOKEN = os.environ.get("APPROVAL_SYNC_TOKEN", "")
PORT = int(os.environ.get("PORT", "8080"))
USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9_]{3,16}$")


SCHEMA = """
CREATE TABLE IF NOT EXISTS username_submissions (
    id BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    username_key TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    submitted_at TIMESTAMPTZ NOT NULL,
    decided_at TIMESTAMPTZ
)
"""


INDEX = """
CREATE INDEX IF NOT EXISTS username_submissions_status_idx
ON username_submissions(status, submitted_at)
"""


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def connect() -> psycopg.Connection:
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is required")
    return psycopg.connect(DATABASE_URL, row_factory=dict_row, connect_timeout=5)


def initialize_database() -> None:
    with connect() as connection:
        connection.execute(SCHEMA)
        connection.execute(INDEX)


def row_to_dict(row: dict[str, Any]) -> dict[str, Any]:
    def iso(value: Any) -> str | None:
        return value.isoformat() if value is not None else None

    return {
        "id": row["id"],
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
        if length <= 0 or length > 1024:
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
                    "SELECT id, username, status, submitted_at, decided_at "
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

        username_key = username.casefold()
        submitted_at = utc_now()
        with connect() as connection:
            inserted = connection.execute(
                "INSERT INTO username_submissions "
                "(username, username_key, status, submitted_at) "
                "VALUES (%s, %s, 'pending', %s) "
                "ON CONFLICT (username_key) DO NOTHING RETURNING id",
                (username, username_key, submitted_at),
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
                        "UPDATE username_submissions SET username = %s, status = 'pending', "
                        "submitted_at = %s, decided_at = NULL WHERE id = %s",
                        (username, submitted_at, existing["id"]),
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
                "SELECT id, username, status, submitted_at, decided_at "
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
                "WHERE id = %s RETURNING id, username, status, submitted_at, decided_at",
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
