import type { CredentialRef } from "../../shared/providers.js";

export interface CredentialVault {
  set(ref: CredentialRef, value: string): Promise<void>;
  get(ref: CredentialRef): Promise<string | undefined>;
  has(ref: CredentialRef): Promise<boolean>;
  delete(ref: CredentialRef): Promise<void>;
}

export class SessionCredentialVault implements CredentialVault {
  private readonly secrets = new Map<string, string>();

  async set(ref: CredentialRef, value: string): Promise<void> {
    this.secrets.set(ref.id, value);
  }

  async get(ref: CredentialRef): Promise<string | undefined> {
    return this.secrets.get(ref.id);
  }

  async has(ref: CredentialRef): Promise<boolean> {
    return this.secrets.has(ref.id);
  }

  async delete(ref: CredentialRef): Promise<void> {
    this.secrets.delete(ref.id);
  }
}
