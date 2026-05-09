# Secret Guard Hook

Example hook that scans stdin and blocks likely secrets.

This is not a production-ready secret scanner. It detects a small set of common patterns and exits with:

- `0` when input looks safe
- `2` when input is blocked

## Usage

```sh
printf '%s\n' "text to scan" | python3 hooks/secret-guard/hook.py
```

Adapt the patterns and allowlist behavior before using this in high-risk repositories.

