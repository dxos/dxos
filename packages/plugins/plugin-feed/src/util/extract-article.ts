//
// Copyright 2026 DXOS.org
//

import Defuddle, { type DefuddleResponse } from 'defuddle/full';

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

const mapResult = (result: DefuddleResponse): ExtractedArticle => {
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

/**
 * Extracts the main article from a web page's HTML using `defuddle`.
 * Discards navigation, comments, ads, and other chrome; returns the body
 * as Markdown plus structured metadata.
 *
 * Works in both browser/worker (uses `DOMParser`) and Node (delegates to
 * `defuddle/node`, which uses linkedom). The Node path is loaded lazily so
 * the linkedom dependency stays out of browser bundles.
 */
export const extractArticle = async (html: string, url?: string): Promise<ExtractedArticle> => {
  if (!html) {
    return { markdown: '', html: '', imageUrls: [] };
  }
  if (isDocumentParserAvailable()) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return mapResult(new Defuddle(doc, { url, separateMarkdown: true }).parse());
  }
  // Node path: defuddle/node accepts an HTML string and returns a Promise.
  const { Defuddle: DefuddleNode } = await import('defuddle/node');
  return mapResult(await DefuddleNode(html, url, { separateMarkdown: true }));
};
