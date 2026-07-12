//
// Copyright 2026 DXOS.org
//

/**
 * Reversible HTML <-> markdown transform for catalog descriptions and book reviews.
 *
 * BookHive supplies descriptions/reviews as HTML (`<b>`, `<i>`, `<br />`); ECHO stores them as markdown
 * (rendered/edited via markdown). The pair is bidirectional so the mapping is symmetric — used one-way
 * on catalog import and round-trip for the published `review`.
 *
 * Inline-only and best-effort by design (block markdown — lists, headings, links — is not handled). To
 * stay safe on user-authored prose it never invents structure: only real `<tag>`s are stripped (a bare
 * `<`/`>` in text is kept), and emphasis is matched only for delimiters hugging non-space content so a
 * stray `*` (e.g. "4* stars", "2 * 4") is left untouched.
 *
 * This is a TS-adapter transform, not a Panproto bridge transform: HTML <-> markdown requires parsing
 * beyond the Expr DSL's literal string ops (the same reason `authors` join/split lives in the codec).
 */

const HTML_ENTITIES: [RegExp, string][] = [
  [/&amp;/g, '&'],
  [/&lt;/g, '<'],
  [/&gt;/g, '>'],
  [/&quot;/g, '"'],
  [/&#39;/g, "'"],
  [/&nbsp;/g, ' '],
];

/** Convert the common inline HTML tags (`<b>`/`<i>`/`<br>`/`<p>`) and entities to markdown. */
export const htmlToMarkdown = (html?: string): string | undefined => {
  if (!html) {
    return undefined;
  }
  let markdown = html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n\n')
    .replace(/<\s*p[^>]*>/gi, '')
    .replace(/<\s*(b|strong)\b[^>]*>([\s\S]*?)<\/\s*\1\s*>/gi, '**$2**')
    .replace(/<\s*(i|em)\b[^>]*>([\s\S]*?)<\/\s*\1\s*>/gi, '*$2*')
    // Strip only remaining real tags (`</?letter…>`); a bare `<`/`>` in prose (e.g. "a < b") is kept.
    .replace(/<\/?[a-zA-Z][^>]*>/g, '');
  for (const [pattern, replacement] of HTML_ENTITIES) {
    markdown = markdown.replace(pattern, replacement);
  }
  markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();
  return markdown.length > 0 ? markdown : undefined;
};

/** Inverse of {@link htmlToMarkdown}: markdown emphasis and line breaks back to inline HTML. */
export const markdownToHtml = (markdown?: string): string | undefined => {
  if (!markdown) {
    return undefined;
  }
  // Match emphasis only for delimiters that hug non-space content and are not adjacent to a word char or
  // another `*`, so a stray/unbalanced `*` (e.g. "4* stars", "2 * 4") is left as literal text.
  const html = markdown
    .replace(/(?<![\w*])\*\*(?=\S)([^*\n]+?)(?<=\S)\*\*(?![\w*])/g, '<b>$1</b>')
    .replace(/(?<![\w*])\*(?=\S)([^*\n]+?)(?<=\S)\*(?![\w*])/g, '<i>$1</i>')
    .replace(/\n/g, '<br />');
  return html.length > 0 ? html : undefined;
};
