async function getApiUrl(): Promise<string> {
  try {
    const result = await browser.storage.local.get("apiUrl");
    return result.apiUrl || "http://localhost:3000";
  } catch {
    return "http://localhost:3000";
  }
}

interface BookmarkData {
  url: string;
  title: string;
  description: string;
  notes: string;
  platform: string;
  platformId: string;
  platformMetadata: Record<string, unknown>;
  faviconUrl: string;
  tags: string[];
  collectionId?: string;
}

const titleInput = document.getElementById("title") as HTMLInputElement;
const notesInput = document.getElementById("notes") as HTMLTextAreaElement;
const tagInput = document.getElementById("tag-input") as HTMLInputElement;
const tagsContainer = document.getElementById("tags-container")!;
const collectionSelect = document.getElementById("collection") as HTMLSelectElement;
const saveBtn = document.getElementById("save-btn") as HTMLButtonElement;
const smartBtn = document.getElementById("smart-btn") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLDivElement;
const previewTitle = document.getElementById("preview-title")!;
const previewUrl = document.getElementById("preview-url")!;
const platformBadge = document.getElementById("platform-badge")!;

let tags: string[] = [];
let collections: Array<{ id: string; name: string }> = [];
let currentTab: { url: string; title: string } | null = null;
let detectedPlatform = "other";

(async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) {
    currentTab = { url: tab.url, title: tab.title || "" };
    previewTitle.textContent = tab.title || "Untitled";
    previewUrl.textContent = tab.url;
    titleInput.value = tab.title || "";
    detectedPlatform = detectPlatform(tab.url);
    updatePlatformBadge(detectedPlatform);
  }

  const apiUrl = await getApiUrl();
  try {
    const res = await fetch(`${apiUrl}/api/collections`);
    const data = await res.json();
    collections = data.data || [];
    for (const col of collections) {
      const opt = document.createElement("option");
      opt.value = col.id;
      opt.textContent = col.name;
      collectionSelect.appendChild(opt);
    }
  } catch {}
})();

tagInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    const val = tagInput.value.trim();
    if (val && !tags.includes(val)) {
      tags.push(val);
      renderTags();
    }
    tagInput.value = "";
  }
});

function renderTags() {
  document.querySelectorAll(".tag").forEach((el) => el.remove());
  const input = tagInput;

  for (const tag of tags) {
    const span = document.createElement("span");
    span.className = "tag";
    span.innerHTML = `${tag} <span class="tag-remove" data-tag="${tag}">&times;</span>`;
    span.querySelector(".tag-remove")?.addEventListener("click", () => {
      tags = tags.filter((t) => t !== tag);
      renderTags();
    });
    tagsContainer.insertBefore(span, input);
  }
  tagsContainer.appendChild(input);
  input.focus();
}

function getData(): BookmarkData {
  return {
    url: currentTab?.url || "",
    title: titleInput.value || currentTab?.title || "",
    description: "",
    notes: notesInput.value,
    platform: detectedPlatform,
    platformId: "",
    platformMetadata: {},
    faviconUrl: "",
    tags,
    collectionId: collectionSelect.value || undefined,
  };
}

async function saveBookmark(data: BookmarkData) {
  const apiUrl = await getApiUrl();
  const res = await fetch(`${apiUrl}/api/bookmarks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Regular save
saveBtn.addEventListener("click", async () => {
  if (!currentTab) return;
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    await saveBookmark(getData());
    showStatus("Bookmark saved!", "success");
    titleInput.value = "";
    notesInput.value = "";
    tags = [];
    renderTags();
  } catch (err: unknown) {
    showStatus(err instanceof Error ? err.message : "Failed to save", "error");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Bookmark";
  }
});

// Smart save — AI summarization + auto-tagging
smartBtn.addEventListener("click", async () => {
  if (!currentTab) return;
  smartBtn.disabled = true;
  smartBtn.innerHTML = `<span class="loading"></span> Analyzing...`;

  try {
    const apiUrl = await getApiUrl();
    const res = await fetch(`${apiUrl}/api/ai/auto-bookmark`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: currentTab.url,
        collectionId: collectionSelect.value || undefined,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err.includes("AI not configured") ? "AI not configured. Configure via CLI: bm config set-ai" : err);
    }

    const result = await res.json();
    showStatus("Smart bookmark saved!", "success");
    titleInput.value = "";
    notesInput.value = "";
    tags = [];
    renderTags();
  } catch (err: unknown) {
    showStatus(err instanceof Error ? err.message : "AI save failed", "error");
  } finally {
    smartBtn.disabled = false;
    smartBtn.textContent = "✨ Smart Save";
  }
});

function showStatus(msg: string, type: "success" | "error") {
  statusEl.textContent = msg;
  statusEl.className = `status ${type}`;
  setTimeout(() => { statusEl.className = "status"; }, 4000);
}

function detectPlatform(url: string): string {
  if (/github\.com/.test(url)) return "github";
  if (/huggingface\.co/.test(url)) return "huggingface";
  if (/arxiv\.org/.test(url)) return "arxiv";
  if (/reddit\.com/.test(url)) return "reddit";
  if (/news\.ycombinator\.com/.test(url)) return "hackernews";
  if (/(twitter\.com|x\.com)/.test(url)) return "twitter";
  return "other";
}

function updatePlatformBadge(platform: string) {
  const names: Record<string, string> = {
    github: "GitHub", huggingface: "HuggingFace", arxiv: "arXiv",
    reddit: "Reddit", hackernews: "Hacker News", twitter: "Twitter / X", other: "Other",
  };
  platformBadge.textContent = names[platform] || "Other";
  platformBadge.className = `platform-badge ${platform}`;
}
