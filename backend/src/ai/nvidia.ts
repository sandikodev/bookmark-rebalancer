import { AiProvider, type ChatMessage, type AiProviderConfig } from "./provider";

export class NvidiaProvider extends AiProvider {
  constructor(config: AiProviderConfig) {
    super({
      baseUrl: "https://integrate.api.nvidia.com/v1",
      model: "meta/llama-3.1-8b-instruct",
      ...config,
    });
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
      throw new Error(`NVIDIA NIM API error (${res.status}): ${err}`);
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
        model: "nvidia/nv-embedqa-e5-v5",
        input: text,
        input_type: "query",
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`NVIDIA embedding error (${res.status}): ${err}`);
    }

    const json = await res.json();
    return json.data?.[0]?.embedding || [];
  }
}
