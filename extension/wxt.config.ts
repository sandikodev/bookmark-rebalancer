import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "Bookmark Rebalancer",
    version: "0.2.0",
    description: "Save and organize bookmarks with AI-powered features",
    permissions: ["storage", "contextMenus", "activeTab"],
    action: {
      default_title: "Bookmark Rebalancer",
      default_icon: {
        16: "icons/icon.svg",
        48: "icons/icon.svg",
      },
    },
    icons: {
      16: "icons/icon.svg",
      48: "icons/icon.svg",
      128: "icons/icon.svg",
    },
  },
  srcDir: "src",
});
