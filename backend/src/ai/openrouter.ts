import { AiProvider, type ChatMessage, type AiProviderConfig } from "./provider";

export class OpenRouterProvider extends AiProvider {
  constructor(config: AiProviderConfig) {
    super({
      baseUrl: "https://openrouter.ai/api/v1",
      model: "openai/gpt-4o-mini",
      ...config,
    });
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const res = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/anomalyco/bookmark-rebalancer",
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenRouter API error (${res.status}): ${err}`);
    }

    const json = await res.json();
    return json.choices?.[0]?.message?.content || "";
  }
}
