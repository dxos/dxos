//
// Copyright 2025 DXOS.org
//

import { parseHTML } from 'linkedom';
import TurndownService from 'turndown';

/** Narrow a turndown DOM node to Element — rules filtered by tag name always receive one. */
const isElement = (node: Node): node is Element => node.nodeType === 1;

/** Read an attribute from a turndown node, returning '' when absent (or the node is not an element). */
const getAttr = (node: Node, name: string): string => (isElement(node) ? (node.getAttribute(name) ?? '') : '');

/**
 * https://www.npmjs.com/package/turndown
 */
const turndown = new TurndownService({
  bulletListMarker: '-',
})
  .remove('script')
  .remove('style')
  .addRule('unwrapAnchors', {
    filter: 'a',
    replacement: (content, node) => {
      const href = getAttr(node, 'href').trim();
      const text = content.trim();
      // An anchor wrapping block-level content (multi-line) cannot be a valid inline link — turndown
      // would emit stranded `](url)[` fragments — and an anchor with no href or no text has nothing
      // to link. In those cases unwrap to the inner content rather than forming a link.
      if (!href || !text || /\n/.test(text)) {
        return content;
      }
      const link = `[${text}](${href})`;
      // `display:block` anchors (e.g. stacked email CTA rows) must each occupy their own line;
      // turndown treats <a> as inline and would otherwise concatenate adjacent ones.
      return /display:\s*block/i.test(getAttr(node, 'style')) ? `\n\n${link}\n\n` : link;
    },
  })
  .addRule('dropTrackingBeacons', {
    filter: 'img',
    replacement: (content, node) => {
      // 1x1 (or 0x0) images are open-tracking beacons, not content — drop them.
      const width = getAttr(node, 'width');
      const height = getAttr(node, 'height');
      if ((width === '0' || width === '1') && (height === '0' || height === '1')) {
        return '';
      }
      const src = getAttr(node, 'src').trim();
      return src ? `![${getAttr(node, 'alt')}](${src})` : '';
    },
  })
  .addRule('cleanListSpacing', {
    filter: 'li',
    replacement: (content, node, options) => {
      content = content.replace(/\n{2,}/g, '\n').trim();
      const parent = node.parentNode;
      const isOrdered = parent && parent.nodeName === 'OL';
      if (isOrdered) {
        // Find the item index for ordered lists.
        const index = Array.prototype.indexOf.call(parent.children, node) + 1;
        return `${index}. ${content}\n`;
      } else {
        // Unordered list: single dash + single space.
        return `${options.bulletListMarker} ${content}\n`;
      }
    },
  });

/** Heuristically detect whether a string contains HTML markup. */
export const isHtml = (str: string): boolean => {
  return /<(\/?(p|div|span|ul|ol|li|a|strong|em|br|table|tr|td|h[1-6]))\b[^>]*>/i.test(str);
};

const preprocessHtml = (html: string): string => {
  // Ensure HTML has proper structure for linkedom parsing.
  // If the HTML is a fragment without html/body tags, wrap it.
  const wrappedHtml = html.trim().startsWith('<html') ? html : `<html><body>${html}</body></html>`;
  return wrappedHtml;
};

/** Convert an HTML string to Markdown. */
export const htmlToMarkdown = (html: string): string =>
  turndown.turndown(parseHTML(preprocessHtml(html), {}).document.body);

/**
 * Strip residual HTML/XML tags that survive turndown conversion (e.g., MS Office namespaced
 * tags like <o:p>, <v:shape>, conditional comments, stray <span style=...>).
 *
 * Namespaced tags and MS conditional comments are stripped unconditionally — they have no
 * meaning in genuine plaintext bodies. The generic inline-tag pass (<span>, <font>, <u>,
 * <div>) is opt-in via `fromHtml` so we don't eat literal angle-bracketed text in plaintext
 * messages.
 */
const stripResidualTags = (str: string, { fromHtml = false }: { fromHtml?: boolean } = {}): string => {
  const cleaned = str
    // 1. Conditional comments: <!--[if mso]>...<![endif]-->.
    .replace(/<!--\s*\[if[^\]]*\][\s\S]*?<!\[endif\]\s*-->/gi, '')
    // 2. Namespaced tags (<o:p>, <v:shape>, <w:WordDocument/>, <m:mathPr>, etc.).
    .replace(/<\/?[a-zA-Z][\w-]*:[^>]*>/g, '');

  // 3. Stray known-bad inline tags that survive turndown in edge cases — HTML pipeline only.
  return fromHtml ? cleaned.replace(/<\/?(span|font|u|div)\b[^>]*>/gi, '') : cleaned;
};

const stripWhitespace = (str: string): string => {
  // Invisible/whitespace characters that newsletters use to pad preview text:
  // soft hyphen (U+00AD), combining grapheme joiner (U+034F), zero-width
  // space/non-joiner/joiner (U+200B-U+200D), word joiner (U+2060), and BOM/
  // ZWNBSP (U+FEFF), plus regular space, tab, NBSP (U+00A0), and figure space (U+2007).
  const INVISIBLE = ' \\t\\u00A0\\u00AD\\u034F\\u200B-\\u200D\\u2007\\u2060\\uFEFF';
  const WHITESPACE = /[ \t\u00A0]*\n[ \t\u00A0]*\n[\s\u00A0]*/g;
  return (
    str
      .trim()
      // Blank out lines that contain only invisible/whitespace characters (newsletter padding).
      .replace(new RegExp(`^[${INVISIBLE}]+$`, 'gm'), '')
      // Convert setext-underline / horizontal-rule lines (3+ `=` or `-`) to a markdown HR.
      .replace(/^[ \t\u00A0]*[=-]{3,}[ \t\u00A0]*$/gm, '---')
      // Replace old-school sign-off dash with horizontal rule.
      .replace(/\\--/g, '---')
      // Blank out lines that contain no letter or digit (e.g., junk separators like `*****`, `,,,,`).
      // Uses Unicode property escapes so non-Latin scripts (Cyrillic, CJK, etc.) are preserved.
      // Empty lines are preserved as paragraph breaks; the `---` HR we just inserted is exempted so it survives.
      .replace(/^(?!---$)[^\p{L}\p{N}\n]*$/gmu, '')
      // Replace multiple newlines with double newlines.
      .replace(WHITESPACE, '\n\n')
      // Trim trailing whitespace from every line; includes the full invisible set (CGJ, ZWNJ,
      // soft hyphen, figure space, etc.) so newsletter padding tacked onto a content line is removed.
      .replace(new RegExp(`[${INVISIBLE}]+$`, 'gm'), '')
      // Keep a quoted block contiguous: drop blank lines between consecutive quoted (`>`) lines.
      // Turndown prefixes every blockquote line with `> `, so paragraph breaks within a quote
      // surface as a bare `> ` line that the no-letter pass above blanks; this rejoins them (and
      // also collapses blank-separated quotes in plaintext bodies).
      .replace(/^(>.*)\n\n+(?=>)/gm, '$1\n')
  );
};

/**
 * Normalize arbitrary text (HTML or plaintext) into clean Markdown. HTML input is converted to
 * Markdown; plaintext is passed through. In both cases runs of blank lines are collapsed so the
 * rendered result never shows more than one blank line between paragraphs.
 */
// TODO(burdon): Replace legal disclaimers, etc.
export const normalizeText = (text: string): string => {
  const fromHtml = isHtml(text);
  const converted = fromHtml ? htmlToMarkdown(text) : text;
  return stripWhitespace(stripResidualTags(converted, { fromHtml }));
};
