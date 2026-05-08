#!/usr/bin/env bun
import type { CreateBookmarkInput } from "@bookmark-rebalancer/shared";

const API = process.env.BM_API || "http://localhost:3000";
const cmd = process.argv[2];
const sub = process.argv[3];
const args = process.argv.slice(4);

async function api(path: string, opts?: { method?: string; body?: unknown }) {
  const res = await fetch(`${API}/api${path}`, {
    method: opts?.method || "GET",
    headers: { "Content-Type": "application/json" },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`Error: ${res.status} ${err}`);
    process.exit(1);
  }
  return res.json();
}

function parseFlags(args: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      flags[key] = args[++i] || "";
    }
  }
  return flags;
}

async function main() {
  switch (cmd) {
    // ─── Bookmark management ───
    case "add": {
      const url = args.find((a) => a.startsWith("http"));
      if (!url) {
        console.error("Usage: bm add <url> [--tags a,b,c] [--notes ...] [--collection <id>] [--smart]");
        process.exit(1);
      }
      const flags = parseFlags(args);

      if (flags.smart !== undefined) {
        const result = await api("/ai/auto-bookmark", {
          method: "POST",
          body: { url, collectionId: flags.collection },
        });
        console.log(`✓ Auto-bookmarked: ${result.data.title || result.data.url}`);
        console.log(`  Tags: ${result.data.tags?.join(", ") || "none"}`);
        console.log(`  Summary: ${result.data.summary?.slice(0, 120)}...`);
        console.log(`  ID: ${result.data.id}`);
        break;
      }

      const input: CreateBookmarkInput = {
        url,
        title: flags.title || "",
        description: flags.description || "",
        notes: flags.notes || "",
        tags: flags.tags ? flags.tags.split(",").map((t) => t.trim()) : [],
        collectionId: flags.collection,
      };
      const result = await api("/bookmarks", { method: "POST", body: input });
      console.log(`✓ Bookmarked: ${result.data.title || result.data.url}`);
      console.log(`  ID: ${result.data.id}`);
      break;
    }

    case "list": {
      const flags = parseFlags(args);
      const params = new URLSearchParams();
      if (flags.platform) params.set("platform", flags.platform);
      if (flags.tag) params.set("tag", flags.tag);
      if (flags.collection) params.set("collectionId", flags.collection);
      if (flags.search) params.set("search", flags.search);
      if (flags.page) params.set("page", flags.page);
      if (flags.limit) params.set("limit", flags.limit);
      const result = await api(`/bookmarks${params.toString() ? `?${params}` : ""}`);

      if (result.data.length === 0) {
        console.log("No bookmarks found.");
        return;
      }

      console.log(`Bookmarks (${result.total} total):`);
      console.log("─".repeat(60));
      for (const bm of result.data) {
        const platform = bm.platform !== "other" ? `[${bm.platform}]` : "";
        const summary = bm.summary ? `\n    └ ${bm.summary.slice(0, 100)}` : "";
        console.log(`  ${platform} ${bm.title || bm.url}`);
        console.log(`    ${bm.url}${summary}`);
        console.log();
      }
      break;
    }

    case "search": {
      const query = args.join(" ");
      if (!query) {
        console.error("Usage: bm search <query>");
        process.exit(1);
      }
      const flags = parseFlags(args);

      if (flags.semantic !== undefined) {
        const result = await api("/ai/search", {
          method: "POST",
          body: { query, limit: parseInt(flags.limit || "10") },
        });
        if (result.data.length === 0) {
          console.log(`No semantic results for "${query}".`);
          return;
        }
        console.log(`Semantic results for "${query}":`);
        for (const bm of result.data) {
          console.log(`  [${(bm.score * 100).toFixed(0)}%] ${bm.title || bm.url}`);
          console.log(`    ${bm.url}`);
          if (bm.summary) console.log(`    ${bm.summary.slice(0, 100)}`);
          console.log();
        }
        break;
      }

      const result = await api(`/bookmarks?search=${encodeURIComponent(query)}`);
      if (result.data.length === 0) {
        console.log(`No results for "${query}".`);
        return;
      }
      console.log(`Results for "${query}":`);
      for (const bm of result.data) {
        console.log(`  ${bm.title || bm.url}`);
        console.log(`    ${bm.url}`);
      }
      break;
    }

    case "summarize": {
      const idOrUrl = args[0];
      if (!idOrUrl) {
        console.error("Usage: bm summarize <bookmark-id|url>");
        process.exit(1);
      }
      if (idOrUrl.startsWith("http")) {
        const result = await api("/ai/summarize", { method: "POST", body: { url: idOrUrl } });
        console.log(`Summary: ${result.data.summary}`);
        break;
      }
      // Summarize by bookmark ID — fetch the bookmark, then summarize
      const bm = await api(`/bookmarks/${idOrUrl}`);
      const result2 = await api("/ai/summarize", { method: "POST", body: { url: bm.data.url } });
      console.log(`Summary: ${result2.data.summary}`);
      break;
    }

    case "smart-tag": {
      const url = args.find((a) => a.startsWith("http"));
      if (!url) {
        console.error("Usage: bm smart-tag <url>");
        process.exit(1);
      }
      const result = await api("/ai/smart-tag", { method: "POST", body: { url } });
      console.log(`Suggested tags: ${result.data.tags.join(", ")}`);
      break;
    }

    // ─── Config ───
    case "config": {
      if (sub === "show") {
        const result = await api("/config");
        if (!result.data) {
          console.log("AI not configured.");
          console.log("Run: bm config set-ai");
          return;
        }
        console.log("AI Configuration:");
        console.log(`  Provider: ${result.data.provider}`);
        console.log(`  Model:    ${result.data.model}`);
        console.log(`  API Key:  ${result.data.apiKey}`);
        if (result.data.baseUrl) console.log(`  Base URL: ${result.data.baseUrl}`);
        console.log(`  Config path: ${result.path || "~/.config/bookmark-rebalancer/config.json"}`);
        break;
      }
      if (sub === "set-ai") {
        const flags = parseFlags(args);
        const provider = flags.provider || "openrouter";
        const apiKey = flags.key || flags["api-key"];
        const model = flags.model || "";
        const baseUrl = flags["base-url"] || "";

        if (!apiKey) {
          console.error("Usage: bm config set-ai --key <api-key> [--provider openrouter|nvidia|custom] [--model <model>] [--base-url <url>]");
          process.exit(1);
        }
        await api("/config/ai", {
          method: "POST",
          body: { provider, apiKey, model, baseUrl },
        });
        console.log(`✓ AI configured: ${provider}${model ? ` / ${model}` : ""}`);
        break;
      }
      console.log("Usage:");
      console.log("  bm config show          — Show current config");
      console.log("  bm config set-ai ...    — Configure AI provider");
      break;
    }

    // ─── Existing commands ───
    case "open": {
      const id = args[0];
      if (!id) { console.error("Usage: bm open <id>"); process.exit(1); }
      const result = await api(`/bookmarks/${id}`);
      if (!result.data?.url) { console.error("Bookmark not found."); process.exit(1); }
      console.log(`Opening: ${result.data.url}`);
      await Bun.$`xdg-open ${result.data.url}`.quiet();
      break;
    }

    case "rm": {
      const id = args[0];
      if (!id) { console.error("Usage: bm rm <id>"); process.exit(1); }
      await api(`/bookmarks/${id}`, { method: "DELETE" });
      console.log(`✓ Deleted bookmark ${id}`);
      break;
    }

    case "tags": {
      const result = await api("/tags");
      if (result.data.length === 0) { console.log("No tags yet."); return; }
      console.log("Tags:");
      for (const t of result.data) console.log(`  ${t.name} (${t.count} bookmarks)`);
      break;
    }

    case "collections": {
      const result = await api("/collections");
      if (result.data.length === 0) { console.log("No collections yet."); return; }
      console.log("Collections:");
      for (const c of result.data) console.log(`  ${c.name} (${c.item_count} items)`);
      break;
    }

    case "help":
    default: {
      console.log(`
bm — Bookmark Rebalancer CLI

Bookmark Management:
  bm add <url> [--tags a,b,c] [--notes "..."] [--collection <id>]
  bm add <url> --smart                          — Auto-summarize & tag
  bm list [--platform github] [--tag <name>] [--collection <id>] [--search <q>]
  bm search <query>                             — Keyword search
  bm search <query> --semantic                  — AI semantic search
  bm open <id>                                  — Open in browser
  bm rm <id>                                    — Delete bookmark

AI Features:
  bm summarize <url|id>                         — Summarize a URL or bookmark
  bm smart-tag <url>                            — Suggest tags via AI

Configuration:
  bm config show                                — Show current config
  bm config set-ai --key <key> [--provider ...] [--model ...] [--base-url ...]

Environment:
  BM_API  Backend URL (default: http://localhost:3000)
`);
      break;
    }
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
