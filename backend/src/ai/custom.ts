import { AiProvider, type ChatMessage, type AiProviderConfig } from "./provider";

export class CustomProvider extends AiProvider {
  constructor(config: AiProviderConfig) {
    super({
      baseUrl: "",
      model: "claude-sonnet-4-20250514",
      ...config,
    });
    if (!this.config.baseUrl) {
      throw new Error("Custom provider requires a baseUrl");
    }
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const res = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Custom provider error (${res.status}): ${err}`);
    }

    const json = await res.json();
    return json.choices?.[0]?.message?.content || "";
  }

  async embed(text: string): Promise<number[]> {
    const res = await fetch(`${this.config.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.model,
        input: text,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Custom provider embedding error (${res.status}): ${err}`);
    }

    const json = await res.json();
    return json.data?.[0]?.embedding || [];
  }
}
