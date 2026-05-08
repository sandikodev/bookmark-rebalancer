export default defineBackground(() => {
  // Create context menu on install
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
      id: "save-to-bm",
      title: "Save to Bookmark Rebalancer",
      contexts: ["link", "page"],
    });
  });

  // Handle context menu click
  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "save-to-bm") {
      const url = info.linkUrl || info.pageUrl || tab?.url;
      const title = info.selectionText || tab?.title || "";

      if (url) {
        try {
          const apiUrl = (await browser.storage.local.get("apiUrl").catch(() => ({}))).apiUrl || "http://localhost:3000";
          await fetch(`${apiUrl}/api/bookmarks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, title }),
          });
        } catch (err) {
          console.error("Failed to save bookmark:", err);
        }
      }
    }
  });
});
