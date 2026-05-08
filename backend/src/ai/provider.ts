export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiProviderConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export abstract class AiProvider {
  protected config: AiProviderConfig;

  constructor(config: AiProviderConfig) {
    this.config = config;
  }

  abstract chat(messages: ChatMessage[]): Promise<string>;
  abstract embed?(text: string): Promise<number[]>;
}
