import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { AiProviderName, AiSettings } from "./ai";

interface Config {
  ai?: AiSettings;
}

const CONFIG_DIR = join(homedir(), ".config", "bookmark-rebalancer");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

function ensureDir() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function loadRaw(): Config {
  ensureDir();
  if (!existsSync(CONFIG_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function saveRaw(config: Config) {
  ensureDir();
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function getAiSettings(): AiSettings | null {
  const config = loadRaw();
  if (!config.ai?.apiKey) return null;

  return {
    provider: (config.ai.provider as AiProviderName) || "openrouter",
    apiKey: config.ai.apiKey,
    model: config.ai.model || "openai/gpt-4o-mini",
    baseUrl: config.ai.baseUrl,
  };
}

export function setAiSettings(settings: AiSettings) {
  const config = loadRaw();
  config.ai = settings;
  saveRaw(config);
}

export function getConfigPath(): string {
  return CONFIG_PATH;
}
