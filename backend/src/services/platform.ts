import type { Platform } from "@bookmark-rebalancer/shared";

interface PlatformInfo {
  platform: Platform;
  platformId: string;
  platformMetadata: Record<string, unknown>;
}

const GITHUB_REPO = /^https?:\/\/(www\.)?github\.com\/([^/]+\/[^/]+?)(\/|$)/;
const HUGGINGFACE_MODEL = /^https?:\/\/(www\.)?huggingface\.co\/([^/]+\/[^/]+?)(\/|$)/;
const HUGGINGFACE_SPACE = /^https?:\/\/(www\.)?huggingface\.co\/spaces\/([^/]+\/[^/]+?)(\/|$)/;
const ARXIV_ABS = /^https?:\/\/(www\.)?arxiv\.org\/abs\/(\d+\.\d+)/;
const REDDIT_THREAD = /^https?:\/\/(www\.)?reddit\.com\/r\/[^/]+\/comments\/([^/]+)/;
const HN_THREAD = /^https?:\/\/(news\.ycombinator\.com|hn\.algolia\.com)\/.*item\?id=(\d+)/;
const TWITTER_STATUS = /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/\w+\/status\/(\d+)/;

export function detectPlatform(url: string): PlatformInfo {
  let match: RegExpMatchArray | null;

  match = url.match(GITHUB_REPO);
  if (match) {
    return {
      platform: "github",
      platformId: match[2].replace(/\.git$/, ""),
      platformMetadata: {},
    };
  }

  match = url.match(HUGGINGFACE_MODEL);
  if (match && !url.includes("/spaces/")) {
    return {
      platform: "huggingface",
      platformId: match[2],
      platformMetadata: { type: "model" },
    };
  }

  match = url.match(HUGGINGFACE_SPACE);
  if (match) {
    return {
      platform: "huggingface",
      platformId: match[2],
      platformMetadata: { type: "space" },
    };
  }

  match = url.match(ARXIV_ABS);
  if (match) {
    return {
      platform: "arxiv",
      platformId: match[2],
      platformMetadata: {},
    };
  }

  match = url.match(REDDIT_THREAD);
  if (match) {
    return {
      platform: "reddit",
      platformId: match[2],
      platformMetadata: {},
    };
  }

  match = url.match(HN_THREAD);
  if (match) {
    return {
      platform: "hackernews",
      platformId: match[2],
      platformMetadata: {},
    };
  }

  match = url.match(TWITTER_STATUS);
  if (match) {
    return {
      platform: "twitter",
      platformId: match[3],
      platformMetadata: {},
    };
  }

  return {
    platform: "other",
    platformId: "",
    platformMetadata: {},
  };
}
