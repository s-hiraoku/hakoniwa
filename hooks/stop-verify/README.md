# Stop Verify Hook

Example hook that runs repository verification before a stop event.

It finds the repository root, runs `scripts/verify.sh`, forwards output, and exits with the same code as the script.

## Usage

```sh
python3 hooks/stop-verify/hook.py
```

This hook assumes it is run inside a git repository containing `scripts/verify.sh`.

