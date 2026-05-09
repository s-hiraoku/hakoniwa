# Dangerous Command Guard Hook

Example hook that scans stdin and blocks obviously dangerous shell commands.

This is not a full shell parser and is not production-ready. It exits with:

- `0` when input looks safe
- `2` when input is blocked

## Usage

```sh
printf '%s\n' "git reset --hard" | python3 hooks/dangerous-command-guard/hook.py
```

Use this as a starting point for policy-specific command blocking.

