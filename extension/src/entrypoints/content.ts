export default defineContentScript({
  matches: ["*://github.com/*", "*://huggingface.co/*", "*://arxiv.org/*"],
  runAt: "document_idle",
  main() {
    const url = window.location.href;
    let platform = "other";
    let data: Record<string, string> = {};

    if (/github\.com/.test(url)) {
      platform = "github";
      const repoName = document.querySelector('[itemprop="name"]');
      const desc = document.querySelector('[itemprop="description"]');
      if (repoName) data.repo = repoName.textContent?.trim() || "";
      if (desc) data.description = desc.textContent?.trim() || "";
    } else if (/huggingface\.co/.test(url)) {
      platform = "huggingface";
      const title = document.querySelector("h1");
      if (title) data.model = title.textContent?.trim() || "";
    } else if (/arxiv\.org/.test(url)) {
      platform = "arxiv";
      const title = document.querySelector("h1.title");
      if (title) data.paper = title.textContent?.trim() || "";
    }

    // Store detected info for the popup to access
    browser.storage.local.set({
      detectedPlatform: platform,
      platformData: data,
    });
  },
});
