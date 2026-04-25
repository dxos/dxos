//
// Copyright 2026 DXOS.org
//

import Defuddle from 'defuddle/full';

/**
 * Article extracted from a web page: main body content (denoised), plus
 * structured metadata and any image URLs found on the page.
 */
export type ExtractedArticle = {
  /** Main body text rendered as Markdown. */
  markdown: string;
  /** Cleaned-up article HTML, suitable for rendering directly. */
  html: string;
  /** Article title (from <title>, og:title, schema.org, etc.). */
  title?: string;
  /** Byline / author. */
  author?: string;
  /** Site description / og:description. */
  description?: string;
  /** ISO 8601 published timestamp, when defuddle could find one. */
  published?: string;
  /** Lead image (og:image / twitter:image / first content image). */
  image?: string;
  /** Source domain (e.g. `example.com`). */
  domain?: string;
  /** All image URLs found in the extracted article, lead image first. */
  imageUrls: string[];
  /** Word count of the extracted body. */
  wordCount?: number;
};

const isDocumentParserAvailable = (): boolean => typeof DOMParser !== 'undefined';

const collectImageUrls = (lead: string | undefined, contentHtml: string): string[] => {
  const seen = new Set<string>();
  const urls: string[] = [];
  const push = (url: string | undefined) => {
    if (!url || url.startsWith('data:') || seen.has(url)) {
      return;
    }
    seen.add(url);
    urls.push(url);
  };
  push(lead);
  const imgRegex = /<img\b[^>]+src=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(contentHtml)) != null) {
    push(match[1]);
  }
  return urls;
};

/**
 * Extracts the main article from a web page's HTML using `defuddle`.
 * Discards navigation, comments, ads, and other chrome; returns the body
 * as Markdown plus structured metadata.
 *
 * Requires a DOM environment (browser or worker with `DOMParser`); throws
 * otherwise. For Node-side use, import `defuddle/node` directly.
 */
export const extractArticle = (html: string, url?: string): ExtractedArticle => {
  if (!html) {
    return { markdown: '', html: '', imageUrls: [] };
  }
  if (!isDocumentParserAvailable()) {
    throw new Error('extractArticle requires a DOM environment with DOMParser.');
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const result = new Defuddle(doc, { url, separateMarkdown: true }).parse();
  const lead = result.image || undefined;
  return {
    markdown: result.contentMarkdown ?? '',
    html: result.content ?? '',
    title: result.title || undefined,
    author: result.author || undefined,
    description: result.description || undefined,
    published: result.published || undefined,
    image: lead,
    domain: result.domain || undefined,
    imageUrls: collectImageUrls(lead, result.content ?? ''),
    wordCount: result.wordCount,
  };
};
