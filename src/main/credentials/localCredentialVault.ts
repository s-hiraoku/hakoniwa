import { safeStorage } from "electron";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { CredentialRef } from "../../shared/providers.js";
import type { CredentialVault } from "./sessionCredentialVault.js";

type StoredCredentials = {
  version: 1;
  encryptedSecrets: Record<string, string>;
};

export class LocalCredentialVault implements CredentialVault {
  private readonly sessionSecrets = new Map<string, string>();
  private stored: StoredCredentials = { version: 1, encryptedSecrets: {} };

  constructor(private readonly storagePath: string) {
    this.stored = this.readStoredCredentials();
  }

  async set(ref: CredentialRef, value: string): Promise<void> {
    if (ref.storage !== "encrypted-local") {
      this.sessionSecrets.set(ref.id, value);
      return;
    }

    if (!safeStorage.isEncryptionAvailable()) {
      this.sessionSecrets.set(ref.id, value);
      return;
    }

    try {
      this.stored.encryptedSecrets[ref.id] = safeStorage.encryptString(value).toString("base64");
      this.sessionSecrets.delete(ref.id);
      this.writeStoredCredentials();
    } catch {
      this.sessionSecrets.set(ref.id, value);
    }
  }

  async get(ref: CredentialRef): Promise<string | undefined> {
    const sessionValue = this.sessionSecrets.get(ref.id);
    if (sessionValue !== undefined) return sessionValue;
    if (ref.storage !== "encrypted-local" || !safeStorage.isEncryptionAvailable()) return undefined;

    const encryptedValue = this.stored.encryptedSecrets[ref.id];
    if (!encryptedValue) return undefined;

    try {
      return safeStorage.decryptString(Buffer.from(encryptedValue, "base64"));
    } catch {
      return undefined;
    }
  }

  async has(ref: CredentialRef): Promise<boolean> {
    return (await this.get(ref)) !== undefined;
  }

  async delete(ref: CredentialRef): Promise<void> {
    this.sessionSecrets.delete(ref.id);
    if (this.stored.encryptedSecrets[ref.id]) {
      delete this.stored.encryptedSecrets[ref.id];
      this.writeStoredCredentials();
    }
  }

  private readStoredCredentials(): StoredCredentials {
    try {
      const parsed = JSON.parse(readFileSync(this.storagePath, "utf8")) as Partial<StoredCredentials>;
      return {
        version: 1,
        encryptedSecrets:
          parsed.encryptedSecrets && typeof parsed.encryptedSecrets === "object"
            ? stringRecord(parsed.encryptedSecrets)
            : {}
      };
    } catch {
      return { version: 1, encryptedSecrets: {} };
    }
  }

  private writeStoredCredentials(): void {
    mkdirSync(dirname(this.storagePath), { recursive: true });
    writeFileSync(this.storagePath, `${JSON.stringify(this.stored, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600
    });
  }
}

function stringRecord(value: object): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
}
