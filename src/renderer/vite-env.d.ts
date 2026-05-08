/// <reference types="vite/client" />

import type { HakoniwaApi } from "../shared/ipc.js";

declare global {
  interface Window {
    hakoniwa?: HakoniwaApi;
  }
}
