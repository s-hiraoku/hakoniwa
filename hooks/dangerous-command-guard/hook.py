#!/usr/bin/env python3
"""Example stdin dangerous command guard hook."""

from __future__ import annotations

import re
import sys

PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("remove filesystem root", re.compile(r"\brm\s+-[^\n]*r[^\n]*f[^\n]*/(?:\s|$)")),
    ("remove home directory", re.compile(r"\brm\s+-[^\n]*r[^\n]*f[^\n]*(?:~|\$HOME)(?:\s|/|$)")),
    ("force push", re.compile(r"\bgit\s+push\b[^\n]*(?:--force|-f)\b")),
    ("hard reset", re.compile(r"\bgit\s+reset\s+--hard\b")),
    ("world-writable chmod", re.compile(r"\bchmod\s+-R\s+777\b")),
    ("read .env file", re.compile(r"\b(?:cat|less|more|tail|head|sed|awk|grep)\b[^\n]*\.env\b")),
    (
        "print private key",
        re.compile(r"\b(?:cat|less|more|tail|head)\b[^\n]*(?:id_rsa|id_ed25519|private[_-]?key|\.pem)\b"),
    ),
]


def find_dangerous_command(text: str) -> str | None:
    for label, pattern in PATTERNS:
        if pattern.search(text):
            return label
    return None


def main() -> int:
    text = sys.stdin.read()
    reason = find_dangerous_command(text)
    if reason:
        print(f"blocked: dangerous command detected ({reason})", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
