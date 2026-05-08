import type { AiProvider } from "./provider";
import { OpenRouterProvider } from "./openrouter";
import { NvidiaProvider } from "./nvidia";
import { CustomProvider } from "./custom";

export type AiProviderName = "openrouter" | "nvidia" | "custom";

export interface AiSettings {
  provider: AiProviderName;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export function createProvider(settings: AiSettings): AiProvider {
  const config = {
    apiKey: settings.apiKey,
    model: settings.model,
    baseUrl: settings.baseUrl,
  };

  switch (settings.provider) {
    case "openrouter":
      return new OpenRouterProvider(config);
    case "nvidia":
      return new NvidiaProvider(config);
    case "custom":
      return new CustomProvider(config);
    default:
      throw new Error(`Unknown AI provider: ${settings.provider}`);
  }
}
