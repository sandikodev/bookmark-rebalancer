import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "Bookmark Rebalancer",
    description: "Save and organize bookmarks with AI-powered features",
    permissions: ["storage", "contextMenus", "activeTab"],
    action: {
      default_title: "Bookmark Rebalancer",
    },
  },
  srcDir: "src",
});
