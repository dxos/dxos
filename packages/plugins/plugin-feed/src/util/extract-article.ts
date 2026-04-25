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

const isChromeElement = (el: Element): boolean => {
  const tag = el.tagName;
  if (tag === 'ASIDE' || tag === 'NAV' || tag === 'FOOTER') {
    return true;
  }
  const role = el.getAttribute('role');
  if (role === 'navigation' || role === 'complementary' || role === 'contentinfo') {
    return true;
  }
  const classNameAndId = `${(el.getAttribute('class') ?? '').toString()} ${el.id ?? ''}`;
  if (CHROME_CLASS_PATTERN.test(classNameAndId)) {
    return true;
  }
  if (isLinkOnlyList(el) || isTagURLBlock(el)) {
    return true;
  }
  // High link density on a sizeable block — tag clouds and link rails.
  if ((el.textContent ?? '').trim().length > 20 && linkDensity(el) >= 0.7) {
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
 * Walk trailing children of the content root from the end, removing chrome
 * blocks. A heading immediately preceding a chrome block is also removed
 * (the heading is the chrome's title, e.g. "Narrower topics" sitting above
 * a tag-href list). Stop at the first non-chrome block — body content
 * resumes there.
 */
/** @internal exported for unit testing the chrome-pruning rules in isolation. */
export const pruneTrailingChrome = (doc: Document): void => {
  const root = findContentRoot(doc);
  if (!root) {
    return;
  }
  let child = root.lastElementChild;
  // Track whether the previous loop iteration removed a chrome element. The
  // pair-wise heading rule (see below) only fires when it did — naturally
  // trailing headings on legitimate articles (e.g. an essay ending with
  // `<h2>Conclusion</h2>` and no body after it) must be preserved.
  let removedPrevious = false;
  while (child) {
    const previous = child.previousElementSibling;
    if (isChromeElement(child)) {
      child.remove();
      child = previous;
      removedPrevious = true;
      continue;
    }
    // Pair-wise: a heading that is now trailing (because we just removed
    // its content section on the prior turn) is the chrome section's title
    // — strip it too.
    if (removedPrevious && isHeading(child) && child.nextElementSibling == null) {
      child.remove();
      child = previous;
      // `removedPrevious` stays true: removing the title still counts.
      continue;
    }
    break;
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
