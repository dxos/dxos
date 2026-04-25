//
// Copyright 2026 DXOS.org
//

/**
 * Lightweight HTML → Markdown extractor for article scraping.
 *
 * Goals:
 * - Identify the main content region (e.g. `<article>`, `<main>`, `[role=main]`) and
 *   discard chrome (nav, header, footer, aside, forms, ads).
 * - Convert common formatting tags to their Markdown equivalents while preserving
 *   paragraph structure and inline links.
 *
 * Non-goals:
 * - Full HTML parsing — this is a regex-based pass, deliberately dependency-free.
 *   Pages that rely heavily on JS to inject content, or that nest the same boundary
 *   element multiple times, may extract poorly. That's acceptable for an RSS reader.
 */

const BOUNDARY_REMOVE = [
  'script',
  'style',
  'template',
  'noscript',
  'svg',
  'nav',
  'header',
  'footer',
  'aside',
  'form',
  'iframe',
  'figure',
];

/** Regex source for a self-contained `<tag>...</tag>` block. */
const blockRegex = (tag: string): RegExp => new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}\\s*>`, 'gi');

/**
 * Decode the small set of HTML entities common in article HTML.
 * (Numeric + a handful of named.)
 */
const decodeEntities = (input: string): string =>
  input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => {
      const cp = Number.parseInt(hex, 16);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : '';
    })
    .replace(/&#(\d+);/g, (_, dec: string) => {
      const cp = Number.parseInt(dec, 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : '';
    })
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lsquo;/gi, '‘')
    .replace(/&rsquo;/gi, '’')
    .replace(/&ldquo;/gi, '“')
    .replace(/&rdquo;/gi, '”')
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&hellip;/gi, '…')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');

/**
 * Strip HTML comments outright. They occasionally contain CMS markers / ads.
 */
const stripComments = (html: string): string => html.replace(/<!--[\s\S]*?-->/g, '');

/**
 * Remove boundary elements (nav/header/footer/etc.) and their full subtree.
 * Two passes: a non-greedy regex doesn't perfectly handle nested same-name
 * elements, so a second pass catches simple cases left behind.
 */
const stripBoundaries = (html: string): string => {
  let out = html;
  for (let pass = 0; pass < 2; pass++) {
    for (const tag of BOUNDARY_REMOVE) {
      out = out.replace(blockRegex(tag), '');
    }
  }
  return out;
};

/**
 * Extract the inner HTML of the most likely main-content region.
 * Search order: <article>, <main>, [role="main"], common content selectors.
 * Falls back to the input if no candidate matches.
 */
const extractMainContent = (html: string): string => {
  // <article>...</article>
  const article = /<article\b[^>]*>([\s\S]*?)<\/article\s*>/i.exec(html);
  if (article?.[1]) {
    return article[1];
  }
  // <main>...</main>
  const main = /<main\b[^>]*>([\s\S]*?)<\/main\s*>/i.exec(html);
  if (main?.[1]) {
    return main[1];
  }
  // [role="main"] on any element.
  const roleMain = /<(\w+)\b[^>]*role=["']main["'][^>]*>([\s\S]*?)<\/\1\s*>/i.exec(html);
  if (roleMain?.[2]) {
    return roleMain[2];
  }
  // Common CMS body selectors as last resort.
  const cms =
    /<(?:div|section)\b[^>]*(?:id|class)=["'][^"']*(?:post-content|entry-content|article-body|article-content)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section)\s*>/i.exec(
      html,
    );
  if (cms?.[1]) {
    return cms[1];
  }
  // Strip everything up to <body> / </body> if present, otherwise return as-is.
  const body = /<body\b[^>]*>([\s\S]*?)<\/body\s*>/i.exec(html);
  if (body?.[1]) {
    return body[1];
  }
  return html;
};

/** Convert standalone block-level tags to Markdown markers. */
const convertBlocks = (html: string): string => {
  let out = html;

  // Headings — emit `# `, `## `, etc. with surrounding blank lines.
  for (let level = 1; level <= 6; level++) {
    out = out.replace(
      new RegExp(`<h${level}\\b[^>]*>([\\s\\S]*?)</h${level}\\s*>`, 'gi'),
      (_, inner: string) => `\n\n${'#'.repeat(level)} ${inner.trim()}\n\n`,
    );
  }

  // Block quotes.
  out = out.replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote\s*>/gi, (_, inner: string) => {
    const text = inner
      .trim()
      .split(/\n/)
      .map((line) => `> ${line}`)
      .join('\n');
    return `\n\n${text}\n\n`;
  });

  // Pre-formatted code blocks.
  out = out.replace(
    /<pre\b[^>]*>(?:\s*<code\b[^>]*>)?([\s\S]*?)(?:<\/code\s*>\s*)?<\/pre\s*>/gi,
    (_, inner: string) => `\n\n\`\`\`\n${inner.trim()}\n\`\`\`\n\n`,
  );

  // Ordered list — emit `1. ...` per item, keeping numbering simple (1. for all rows).
  out = out.replace(/<ol\b[^>]*>([\s\S]*?)<\/ol\s*>/gi, (_, inner: string) => {
    const items = [...inner.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li\s*>/gi)].map((match) => match[1].trim());
    return `\n\n${items.map((text) => `1. ${text}`).join('\n')}\n\n`;
  });

  // Unordered list — emit `- ...` per item.
  out = out.replace(/<ul\b[^>]*>([\s\S]*?)<\/ul\s*>/gi, (_, inner: string) => {
    const items = [...inner.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li\s*>/gi)].map((match) => match[1].trim());
    return `\n\n${items.map((text) => `- ${text}`).join('\n')}\n\n`;
  });

  // Paragraphs / divs / sections — surround content with blank lines.
  out = out.replace(/<\s*(?:p|div|section)\b[^>]*>/gi, '\n\n');
  out = out.replace(/<\/\s*(?:p|div|section)\s*>/gi, '\n\n');

  // Line breaks.
  out = out.replace(/<\s*br\s*\/?\s*>/gi, '\n');

  return out;
};

/** Convert inline formatting tags. Order matters — links before bold/italic so that
 *  link text isn't accidentally consumed. */
const convertInline = (html: string): string => {
  let out = html;

  // Images: `![alt](src)`. Skip data: URIs to keep snippets short.
  // Match attributes in any order — src and alt may appear before or after each other.
  out = out.replace(/<img\b([^>]*)\/?\s*>/gi, (_, attrs: string) => {
    const src = /src=["']([^"']+)["']/i.exec(attrs)?.[1];
    if (!src || src.startsWith('data:')) {
      return '';
    }
    const alt = /alt=["']([^"']*)["']/i.exec(attrs)?.[1] ?? '';
    return `![${alt}](${src})`;
  });

  // Links: `[text](href)`. Strip empty / hash-only anchors.
  out = out.replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a\s*>/gi, (_, href: string, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, '').trim();
    if (!text || href.startsWith('#') || href.startsWith('javascript:')) {
      return text;
    }
    return `[${text}](${href})`;
  });

  // Inline code.
  out = out.replace(/<code\b[^>]*>([\s\S]*?)<\/code\s*>/gi, (_, inner: string) => `\`${inner.trim()}\``);

  // Strong / bold.
  out = out.replace(
    /<\s*(?:strong|b)\b[^>]*>([\s\S]*?)<\/\s*(?:strong|b)\s*>/gi,
    (_, inner: string) => `**${inner.trim()}**`,
  );

  // Emphasis / italic.
  out = out.replace(/<\s*(?:em|i)\b[^>]*>([\s\S]*?)<\/\s*(?:em|i)\s*>/gi, (_, inner: string) => `*${inner.trim()}*`);

  return out;
};

/** Final cleanup: strip any leftover tags, normalize whitespace. */
const finalize = (markdown: string): string => {
  // Strip leftover tags.
  let out = markdown.replace(/<[^>]+>/g, '');
  out = decodeEntities(out);
  // Collapse horizontal whitespace, preserve newlines.
  out = out.replace(/[\t\f\v ]+/g, ' ');
  // Trim spaces around newlines.
  out = out.replace(/ *\n */g, '\n');
  // Collapse 3+ consecutive newlines to 2.
  out = out.replace(/\n{3,}/g, '\n\n');
  return out.trim();
};

export type HtmlToMarkdownOptions = {
  /**
   * If false, skip the main-content extraction and process the entire input.
   * Useful when the caller already knows the input is just the article body.
   */
  extractMainContent?: boolean;
};

/**
 * Convert article HTML to a Markdown string. Tries to identify the main content
 * region and discards page chrome before formatting.
 */
export const htmlToMarkdown = (html: string, options: HtmlToMarkdownOptions = {}): string => {
  if (!html) {
    return '';
  }
  let working = stripComments(html);
  if (options.extractMainContent !== false) {
    working = extractMainContent(working);
  }
  working = stripBoundaries(working);
  working = convertBlocks(working);
  working = convertInline(working);
  return finalize(working);
};
