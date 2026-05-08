import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { bookmarks } from "./routes/bookmarks";
import { tags } from "./routes/tags";
import { collections } from "./routes/collections";
import { projects } from "./routes/projects";
import { schedule } from "./routes/schedule";
import { ai } from "./routes/ai";
import { getAiSettings, setAiSettings, getConfigPath } from "./config";

const app = new Hono();

app.use("*", logger());
app.use("*", cors());

app.route("/api/bookmarks", bookmarks);
app.route("/api/tags", tags);
app.route("/api/collections", collections);
app.route("/api/projects", projects);
app.route("/api/schedule", schedule);
app.route("/api/ai", ai);

app.get("/api/health", (c) => c.json({ status: "ok" }));

// GET /api/config — Get current AI config (without exposing full API key)
app.get("/api/config", (c) => {
  const settings = getAiSettings();
  if (!settings) return c.json({ data: null });
  return c.json({
    data: {
      ...settings,
      apiKey: settings.apiKey ? `${settings.apiKey.slice(0, 8)}...` : "",
    },
  });
});

// POST /api/config/ai — Set AI config
app.post("/api/config/ai", async (c) => {
  const body = await c.req.json();
  const { provider, apiKey, model, baseUrl } = body;
  if (!apiKey) return c.json({ error: "apiKey is required" }, 400);
  setAiSettings({ provider: provider || "openrouter", apiKey, model: model || "", baseUrl: baseUrl || "" });
  return c.json({ success: true, path: getConfigPath() });
});

const port = parseInt(process.env.PORT || "3000");
console.log(`Server running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
