import * as cheerio from "cheerio";

export interface FetchedContent {
  title: string;
  description: string;
  text: string;
}

export async function fetchPageContent(url: string): Promise<FetchedContent> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; BookmarkRebalancer/1.0)",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  // Remove script, style, nav, footer
  $("script, style, nav, footer, header, .sidebar, .menu, iframe").remove();

  const title =
    $('meta[property="og:title"]').attr("content") ||
    $("title").text() ||
    $("h1").first().text() ||
    "";

  const description =
    $('meta[property="og:description"]').attr("content") ||
    $('meta[name="description"]').attr("content") ||
    "";

  // Get main content text
  const text = $("body")
    .text()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);

  return { title: title.trim(), description: description.trim(), text };
}
