#!/usr/bin/env bun
import type { CreateBookmarkInput } from "@bookmark-rebalancer/shared";

const API = process.env.BM_API || "http://localhost:3000";
const VERSION = "0.2.0";

const first = process.argv[2];
if (first === "--version" || first === "-v") {
  console.log(`bm v${VERSION}`);
  process.exit(0);
}
if (first === "--help" || first === "-h") {
  showHelp();
  process.exit(0);
}

const cmd = first;
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

    // ─── Projects ───
    case "project": {
      if (!sub) { console.error("Usage: bm project <create|list|show|add-bookmark|rm>"); break; }

      if (sub === "create") {
        const flags = parseFlags(args);
        const name = args.find(a => !a.startsWith("--"));
        if (!name) { console.error("Usage: bm project create <name> [--description ...] [--priority 3]"); process.exit(1); }
        const result = await api("/projects", {
          method: "POST",
          body: { name, description: flags.description || "", priority: parseInt(flags.priority || "3") },
        });
        console.log(`✓ Project created: ${result.data.name} (${result.data.id})`);
        break;
      }

      if (sub === "list") {
        const result = await api("/projects");
        if (result.data.length === 0) { console.log("No projects yet."); return; }
        console.log("Projects:");
        for (const p of result.data) {
          const statusBadge = p.status === "active" ? "●" : "○";
          const pct = p.total_entries > 0 ? ` ${Math.round((p.completed_entries / p.total_entries) * 100)}% done` : "";
          console.log(`  ${statusBadge} ${p.name} (P${p.priority}) — ${p.bookmark_count} bookmarks${pct}`);
        }
        break;
      }

      if (sub === "show") {
        const id = args[0];
        if (!id) { console.error("Usage: bm project show <id>"); process.exit(1); }
        const result = await api(`/projects/${id}`);
        const p = result.data;
        console.log(`Project: ${p.name}`);
        console.log(`  Status: ${p.status}`);
        console.log(`  Priority: P${p.priority}`);
        console.log(`  Bookmarks: ${p.bookmark_count}`);
        if (p.bookmarks?.length) {
          for (const bm of p.bookmarks) {
            console.log(`    · ${bm.title || bm.url}`);
          }
        }
        break;
      }

      if (sub === "add-bookmark") {
        const projectId = args[0];
        const bookmarkId = args[1];
        if (!projectId || !bookmarkId) { console.error("Usage: bm project add-bookmark <project-id> <bookmark-id>"); process.exit(1); }
        await api(`/projects/${projectId}/bookmarks`, {
          method: "POST",
          body: { bookmarkId },
        });
        console.log("✓ Bookmark added to project");
        break;
      }

      if (sub === "rm") {
        const id = args[0];
        if (!id) { console.error("Usage: bm project rm <id>"); process.exit(1); }
        await api(`/projects/${id}`, { method: "DELETE" });
        console.log(`✓ Project deleted`);
        break;
      }

      console.error("Unknown project subcommand. Use: create, list, show, add-bookmark, rm");
      break;
    }

    // ─── Schedule ───
    case "schedule": {
      if (!sub) { console.error("Usage: bm schedule <list|add|done|rm>"); break; }

      const flags = parseFlags(args);

      if (sub === "list") {
        const params = new URLSearchParams();
        if (flags.project) params.set("projectId", flags.project);
        if (flags.date) params.set("date", flags.date);
        if (flags.week) params.set("week", flags.week);
        if (flags.completed) params.set("completed", flags.completed);
        const qs = params.toString();
        const result = await api(`/schedule${qs ? `?${qs}` : ""}`);
        if (result.data.length === 0) { console.log("No schedule entries."); return; }
        console.log("Schedule:");
        for (const s of result.data) {
          const check = s.completed ? "✓" : "○";
          const date = s.scheduled_date?.slice(0, 10);
          console.log(`  ${check} [${date}] ${s.project_name} — ${s.duration_minutes}min`);
          if (s.notes) console.log(`       ${s.notes}`);
        }
        break;
      }

      if (sub === "add") {
        const projectId = args[0];
        if (!projectId) { console.error("Usage: bm schedule add <project-id> --date 2026-06-01 [--duration 60] [--notes ...]"); process.exit(1); }
        if (!flags.date) { console.error("--date is required"); process.exit(1); }
        const result = await api("/schedule", {
          method: "POST",
          body: {
            projectId,
            scheduledDate: flags.date,
            durationMinutes: parseInt(flags.duration || "60"),
            notes: flags.notes || "",
          },
        });
        console.log(`✓ Schedule added: ${flags.date} (${flags.duration || 60}min)`);
        break;
      }

      if (sub === "done") {
        const id = args[0];
        if (!id) { console.error("Usage: bm schedule done <id>"); process.exit(1); }
        await api(`/schedule/${id}`, { method: "PUT", body: { completed: true } });
        console.log("✓ Marked as done");
        break;
      }

      if (sub === "rm") {
        const id = args[0];
        if (!id) { console.error("Usage: bm schedule rm <id>"); process.exit(1); }
        await api(`/schedule/${id}`, { method: "DELETE" });
        console.log("✓ Schedule deleted");
        break;
      }

      console.error("Unknown schedule subcommand. Use: list, add, done, rm");
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
      showHelp();
      break;
    }
  }
}

function showHelp() {
  console.log(`
bm v${VERSION} — Bookmark Rebalancer CLI

Usage:
  bm <command> [options]

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

Projects:
  bm project create <name> [--description ...] [--priority 3]
  bm project list
  bm project show <id>
  bm project add-bookmark <project-id> <bookmark-id>
  bm project rm <id>

Schedule:
  bm schedule list [--project <id>] [--date 2026-06-01] [--week 2026-06-01]
  bm schedule add <project-id> --date <date> [--duration 60] [--notes ...]
  bm schedule done <id>
  bm schedule rm <id>

Configuration:
  bm config show                                — Show current config
  bm config set-ai --key <key> [--provider ...] [--model ...] [--base-url ...]

Environment:
  BM_API  Backend URL (default: http://localhost:3000)
`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
