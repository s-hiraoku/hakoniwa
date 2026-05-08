import type { ProviderConfig } from "../../shared/providers.js";

const now = new Date().toISOString();

export const CODEX_GATEWAY_PROVIDER_ID = "agent-backend.codex-gateway.default";

export function createDefaultProviderConfigs(): {
  agentBackends: ProviderConfig[];
  modelProviders: ProviderConfig[];
} {
  return {
    agentBackends: [
      {
        id: CODEX_GATEWAY_PROVIDER_ID,
        kind: "codex-gateway",
        displayName: "Codex Gateway",
        enabled: true,
        settings: {
          gatewayUrl: process.env.CODEX_GATEWAY_URL ?? "http://127.0.0.1:8787",
          preferSse: true,
          pollingIntervalMs: 3000
        },
        credentialRefs: {
          token: {
            id: `${CODEX_GATEWAY_PROVIDER_ID}.token`,
            providerConfigId: CODEX_GATEWAY_PROVIDER_ID,
            key: "token",
            label: "Gateway token",
            storage: "session-memory"
          }
        },
        createdAt: now,
        updatedAt: now
      },
      comingSoonAgentBackend("agent-backend.opencode.placeholder", "opencode", "OpenCode"),
      comingSoonAgentBackend(
        "agent-backend.direct-api-agent.placeholder",
        "direct-api-agent",
        "Direct API Agent"
      )
    ],
    modelProviders: [
      comingSoonModelProvider("model.openai.placeholder", "openai", "OpenAI"),
      comingSoonModelProvider("model.anthropic.placeholder", "anthropic", "Anthropic"),
      comingSoonModelProvider("model.gemini.placeholder", "gemini", "Google Gemini"),
      comingSoonModelProvider("model.openrouter.placeholder", "openrouter", "OpenRouter"),
      comingSoonModelProvider("model.ollama.placeholder", "ollama", "Ollama"),
      comingSoonModelProvider("model.lmstudio.placeholder", "lmstudio", "LM Studio"),
      comingSoonModelProvider(
        "model.openai-compatible.placeholder",
        "openai-compatible",
        "Custom OpenAI-compatible"
      )
    ]
  };
}

function comingSoonAgentBackend(
  id: ProviderConfig["id"],
  kind: ProviderConfig["kind"],
  displayName: string
): ProviderConfig {
  return {
    id,
    kind,
    displayName,
    enabled: false,
    settings: { comingSoon: true },
    credentialRefs: {},
    createdAt: now,
    updatedAt: now
  };
}

function comingSoonModelProvider(
  id: ProviderConfig["id"],
  kind: ProviderConfig["kind"],
  displayName: string
): ProviderConfig {
  return {
    id,
    kind,
    displayName,
    enabled: false,
    settings: { comingSoon: true },
    credentialRefs: {},
    createdAt: now,
    updatedAt: now
  };
}
