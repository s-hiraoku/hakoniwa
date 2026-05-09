#!/usr/bin/env python3
"""Example stop hook that runs scripts/verify.sh from the repo root."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def find_repo_root(start: Path) -> Path:
    current = start.resolve()
    for path in (current, *current.parents):
        if (path / ".git").exists() and (path / "scripts" / "verify.sh").exists():
            return path
    raise FileNotFoundError("could not find repo root with scripts/verify.sh")


def main() -> int:
    try:
        repo_root = find_repo_root(Path.cwd())
    except FileNotFoundError as exc:
        print(f"stop-verify failed: {exc}", file=sys.stderr)
        return 2

    script = repo_root / "scripts" / "verify.sh"
    result = subprocess.run(["bash", str(script)], cwd=repo_root, check=False)
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())

