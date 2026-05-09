#!/usr/bin/env python3
"""Example stdin secret guard hook."""

from __future__ import annotations

import re
import sys

PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("OpenAI-style API key", re.compile(r"\bsk-[A-Za-z0-9_-]{20,}\b")),
    ("GitHub token-like string", re.compile(r"\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{30,}\b")),
    ("AWS access key id", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("private key block", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    (
        ".env secret assignment",
        re.compile(r"(?im)^\s*(?:[A-Z0-9_]*SECRET|[A-Z0-9_]*TOKEN|[A-Z0-9_]*API_KEY|PASSWORD)\s*=\s*.+$"),
    ),
]


def find_secret(text: str) -> str | None:
    for label, pattern in PATTERNS:
        if pattern.search(text):
            return label
    return None


def main() -> int:
    text = sys.stdin.read()
    reason = find_secret(text)
    if reason:
        print(f"blocked: likely secret detected ({reason})", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

