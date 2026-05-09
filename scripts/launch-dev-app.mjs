import { spawn } from "node:child_process";
import { resolve } from "node:path";

const appPath = resolve("release/mac-arm64/Hakoniwa.app");
const devServerUrl = process.env.HAKONIWA_DEV_SERVER_URL ?? "http://127.0.0.1:5173";

const launcher = spawn(
  "open",
  ["-n", appPath, "--args", `--hakoniwa-dev-server-url=${devServerUrl}`],
  { stdio: "inherit" }
);

launcher.on("exit", (code) => {
  if (code && code !== 0) {
    process.exitCode = code;
    return;
  }
  console.log("Hakoniwa dev app launched. Press Ctrl+C to stop dev servers.");
});

const keepAlive = setInterval(() => undefined, 2 ** 30);

function shutdown() {
  clearInterval(keepAlive);
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
