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

//
// Trailing-chrome pruning
//
// Defuddle's heuristics already strip nav/header/footer/aside at the page
// level, but on some sites tag clouds and "related" rails live INSIDE the
// `<article>`/`<main>` container — defuddle keeps them because they're
// structurally part of the body. We walk trailing children of the content
// root and drop anything that scores as chrome (tag-href list, link-only
// list, recognisable class/id, high link density). Only trailing siblings
// are touched — the same heading text mid-article is left alone.
//

/** Substring patterns on class/id that mark a block as chrome. */
const CHROME_CLASS_PATTERN =
  /(?:^|[\s_-])(?:tag|topic|related|recirc|footer|sidebar|widget|share|social|comments?|disqus|recommend|more[-_]from|read[-_]next|outbrain|taboola)(?:[\s_-]|$)/i;

/** Hrefs that point to tag/category/related routes. */
const CHROME_HREF_PATTERN = /\/(?:tags?|topics?|categor(?:y|ies)|authors?|related|recommended)\//i;

const isHeading = (el: Element): boolean => /^H[1-6]$/i.test(el.tagName);

const linkDensity = (el: Element): number => {
  const text = (el.textContent ?? '').trim();
  if (text.length === 0) {
    return 0;
  }
  const linkText = Array.from(el.querySelectorAll('a'))
    .map((anchor) => (anchor.textContent ?? '').trim())
    .join(' ');
  return linkText.length / text.length;
};

/** A `<ul>` / `<ol>` whose items are essentially a single link each. */
const isLinkOnlyList = (el: Element): boolean => {
  if (el.tagName !== 'UL' && el.tagName !== 'OL') {
    return false;
  }
  const items = Array.from(el.children).filter((child) => child.tagName === 'LI');
  if (items.length === 0) {
    return false;
  }
  return items.every((li) => {
    const links = li.querySelectorAll('a');
    if (links.length !== 1) {
      return false;
    }
    const text = (li.textContent ?? '').trim();
    const linkText = (links[0].textContent ?? '').trim();
    // The <li>'s text is essentially just the link text (allow a few stray chars).
    return text.length > 0 && Math.abs(text.length - linkText.length) <= 4;
  });
};

/** Block where the majority of links point to tag/category/related routes. */
const isTagURLBlock = (el: Element): boolean => {
  const links = Array.from(el.querySelectorAll('a[href]'));
  if (links.length < 2) {
    return false;
  }
  const matching = links.filter((anchor) => CHROME_HREF_PATTERN.test(anchor.getAttribute('href') ?? ''));
  return matching.length / links.length > 0.6;
};

/**
 * True when the element has no body-content descendants. Body content is
 * paragraphs, blockquotes, code/pre, figures, images, and tables — the
 * signal that a block contributes article substance, not chrome. (Lists and
 * raw `<a>` tags don't count: tag clouds and link rails are entirely those.)
 */
const hasNoBodyContent = (el: Element): boolean =>
  el.querySelector('p, blockquote, pre, code, figure, img, table') == null;

const isChromeElement = (el: Element): boolean => {
  // Strong structural signals — fire alone.
  const tag = el.tagName;
  if (tag === 'ASIDE' || tag === 'NAV' || tag === 'FOOTER') {
    return true;
  }
  const role = el.getAttribute('role');
  if (role === 'navigation' || role === 'complementary' || role === 'contentinfo') {
    return true;
  }
  // Link-only list is purely structural and self-contained — safe.
  if (isLinkOnlyList(el)) {
    return true;
  }
  // Tag-href ratio AND class-hint can both fire on a wrapper that *contains*
  // a tag rail nested deep among real article paragraphs (the rail's links
  // skew the container's link counts above threshold). Only treat as chrome
  // when the element has no body-content descendants — i.e. it's structurally
  // a link rail itself, not a body wrapper that happens to nest one.
  if (!hasNoBodyContent(el)) {
    return false;
  }
  if (isTagURLBlock(el)) {
    return true;
  }
  const classNameAndId = `${(el.getAttribute('class') ?? '').toString()} ${el.id ?? ''}`;
  if (CHROME_CLASS_PATTERN.test(classNameAndId)) {
    return true;
  }
  return false;
};

/**
 * Find the element defuddle is most likely to treat as the main content
 * root, so we prune at the same scope it'll later extract. Mirrors the
 * common selector chain article > main > [role=main] > body.
 */
const findContentRoot = (doc: Document): Element | null =>
  doc.querySelector('article') ?? doc.querySelector('main') ?? doc.querySelector('[role="main"]') ?? doc.body;

/**
 * First pass: scan all descendants of the content root and remove elements
 * that look like chrome wherever they appear. An element qualifies when:
 *   - its class/id contains a chrome keyword
 *     (`tag`, `topic`, `related`, `comments`, `share`, `widget`, `sidebar`,
 *      `footer`, `recommend`, etc.), AND
 *   - it has no body-content descendants (paragraphs, blockquotes, figures,
 *     tables) — i.e. it's a self-contained widget, not an article wrapper
 *     that happens to share a keyword.
 * Plus elements that are structurally just a list of links (tag clouds,
 * "related" rails) regardless of class.
 *
 * This catches chrome buried alongside body content in real-world layouts
 * (e.g. theregister's `<div class="similar_topics">` and `<div class="comments">`
 * nested as siblings of the article body inside `<div id="article-wrapper">`).
 */
const pruneChromeDescendants = (root: Element): void => {
  const candidates = Array.from(root.querySelectorAll('*'));
  for (const el of candidates) {
    // Skip elements already detached because an ancestor was removed.
    if (!root.contains(el)) {
      continue;
    }
    if (isChromeElement(el)) {
      el.remove();
    }
  }
};

/**
 * Second pass: when the descendant scan removed an element that used to sit
 * at the trailing edge of the article, the heading that titled it is now
 * dangling. Strip it.
 *
 * Naturally-trailing headings on legitimate articles (essays ending with
 * `<h2>Conclusion</h2>`) are preserved because we only fire when the
 * original trailing edge was actually severed.
 */
const trimDanglingTrailingHeading = (root: Element): void => {
  let cursor = root.lastElementChild;
  while (cursor && isHeading(cursor) && cursor.nextElementSibling == null) {
    const previous = cursor.previousElementSibling;
    cursor.remove();
    cursor = previous;
  }
};

/** @internal exported for unit testing the chrome-pruning rules in isolation. */
export const pruneTrailingChrome = (doc: Document): void => {
  const root = findContentRoot(doc);
  if (!root) {
    return;
  }
  // Capture the original trailing edge so we can tell after pruning whether
  // any chrome was removed FROM the end (vs only from mid-article).
  const originalLastChild = root.lastElementChild;
  pruneChromeDescendants(root);
  if (originalLastChild && !root.contains(originalLastChild)) {
    trimDanglingTrailingHeading(root);
  }
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
    pruneTrailingChrome(doc);
    return mapResult(new Defuddle(doc, { url, separateMarkdown: true }).parse());
  }
  // Node path: defuddle/node accepts an HTML string and returns a Promise.
  // Trailing-chrome pruning is currently DOM-based and only runs in the
  // browser path; agent operations using the Node path may see boilerplate
  // bleed-through on sites like theregister.com until linkedom-based pruning
  // is added.
  const { Defuddle: DefuddleNode } = await import('defuddle/node');
  return mapResult(await DefuddleNode(html, url, { separateMarkdown: true }));
};
