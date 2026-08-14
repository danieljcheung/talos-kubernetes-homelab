"""Minimal Minecraft Java Server List Ping client for public aggregate status."""

from __future__ import annotations

import json
import socket
from typing import Any


STATUS_PROTOCOL_VERSION = 763  # Minecraft 1.20.1
MAX_PACKET_LENGTH = 1_048_576
MAX_VARINT_BYTES = 5


class MinecraftStatusError(RuntimeError):
    """Raised when the Minecraft status response is unavailable or invalid."""


def encode_varint(value: int) -> bytes:
    if value < 0:
        raise ValueError("VarInt values must be non-negative")
    encoded = bytearray()
    while True:
        current = value & 0x7F
        value >>= 7
        if value:
            encoded.append(current | 0x80)
        else:
            encoded.append(current)
            return bytes(encoded)


def read_exact(connection: socket.socket, length: int) -> bytes:
    data = bytearray()
    while len(data) < length:
        chunk = connection.recv(length - len(data))
        if not chunk:
            raise MinecraftStatusError("Minecraft status connection closed early")
        data.extend(chunk)
    return bytes(data)


def read_varint(connection: socket.socket) -> int:
    value = 0
    for index in range(MAX_VARINT_BYTES):
        raw = read_exact(connection, 1)[0]
        value |= (raw & 0x7F) << (7 * index)
        if not raw & 0x80:
            return value
    raise MinecraftStatusError("Minecraft status response contains an invalid VarInt")


def parse_status_payload(payload: bytes) -> dict[str, int]:
    try:
        decoded: Any = json.loads(payload.decode("utf-8"))
        players = decoded["players"]
        online = players["online"]
        maximum = players["max"]
    except (KeyError, TypeError, ValueError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise MinecraftStatusError("Minecraft status response has an invalid shape") from error

    if (
        isinstance(online, bool)
        or isinstance(maximum, bool)
        or not isinstance(online, int)
        or not isinstance(maximum, int)
        or online < 0
        or maximum < 0
        or online > maximum
    ):
        raise MinecraftStatusError("Minecraft status response has invalid player counts")

    return {"players": online, "maxPlayers": maximum}


def fetch_status(host: str, port: int, timeout: float = 2.0) -> dict[str, int]:
    if not host or not 1 <= port <= 65535:
        raise ValueError("A valid Minecraft status host and port are required")

    address = host.encode("utf-8")
    handshake = b"".join(
        (
            encode_varint(0),
            encode_varint(STATUS_PROTOCOL_VERSION),
            encode_varint(len(address)),
            address,
            port.to_bytes(2, "big"),
            encode_varint(1),
        )
    )
    packet = encode_varint(len(handshake)) + handshake
    status_request = b"\x01\x00"

    try:
        with socket.create_connection((host, port), timeout=timeout) as connection:
            connection.sendall(packet)
            connection.sendall(status_request)
            packet_length = read_varint(connection)
            if packet_length <= 0 or packet_length > MAX_PACKET_LENGTH:
                raise MinecraftStatusError("Minecraft status response packet is invalid")
            response = read_exact(connection, packet_length)
            response_stream = _BytesReader(response)
            if response_stream.read_varint() != 0:
                raise MinecraftStatusError("Minecraft status response packet is invalid")
            payload_length = response_stream.read_varint()
            if payload_length <= 0 or payload_length > response_stream.remaining:
                raise MinecraftStatusError("Minecraft status response payload is invalid")
            return parse_status_payload(response_stream.read(payload_length))
    except (OSError, TimeoutError) as error:
        raise MinecraftStatusError("Minecraft status connection failed") from error


class _BytesReader:
    def __init__(self, data: bytes):
        self._data = data
        self._offset = 0

    @property
    def remaining(self) -> int:
        return len(self._data) - self._offset

    def read(self, length: int) -> bytes:
        if length < 0 or length > self.remaining:
            raise MinecraftStatusError("Minecraft status response ended early")
        start = self._offset
        self._offset += length
        return self._data[start:self._offset]

    def read_varint(self) -> int:
        value = 0
        for index in range(MAX_VARINT_BYTES):
            raw = self.read(1)[0]
            value |= (raw & 0x7F) << (7 * index)
            if not raw & 0x80:
                return value
        raise MinecraftStatusError("Minecraft status response contains an invalid VarInt")
