//
// Copyright 2026 DXOS.org
//

import { OBJECT_URL_SCHEMES } from '@dxos/ui-editor';

export type Embed = { label: string; eid: string };

/** Matches an object embed, `![label](echo:/<id>)`, as the editor's preview widget does. */
const EMBED_PATTERN = new RegExp(`!\\[([^\\]]*)\\]\\(((?:${OBJECT_URL_SCHEMES.join('|')})[^)\\s]*)\\)`, 'g');

/** Marks a removed embed until the blank lines around it are collapsed; a private-use character, so absent from real text. */
const REMOVED = '\uE000';

const REMOVED_RUN = /(\n*)[ \t]*\uE000(?:\s*\uE000)*[ \t]*(\n*)/g;

/** The object embeds in a document, in order. */
export const findEmbeds = (content: string): Embed[] =>
  Array.from(content.matchAll(EMBED_PATTERN), ([, label, eid]) => ({ label, eid }));

/**
 * Replaces each object embed with the replacer's text, or removes it when the replacer returns `undefined`.
 * A removed block embed leaves a single blank line between its neighbours, and none at either end.
 */
export const replaceEmbeds = (
  content: string,
  replacer: (embed: Embed, index: number) => string | undefined,
): string => {
  let index = 0;
  const marked = content.replace(
    EMBED_PATTERN,
    (_, label: string, eid: string) => replacer({ label, eid }, index++) ?? REMOVED,
  );

  // Collapsed per run of removed embeds, so adjacent ones leave one gap rather than one each.
  return marked.replace(REMOVED_RUN, (match, before: string, after: string, offset: number) => {
    if (offset === 0 || offset + match.length === marked.length) {
      return '';
    }

    // Inline within a line: keep whatever line break followed or preceded it.
    if (!before || !after) {
      return before || after;
    }

    return '\n\n';
  });
};

/** Removes every object embed, since an exported file cannot resolve them. */
export const removeEmbeds = (content: string): string => replaceEmbeds(content, () => undefined);

/**
 * The document rendered by `render`, with each printable embed's HTML at its position and the rest removed.
 * Each embed is a placeholder paragraph while rendering; the placeholder prefix is advanced until the rendered
 * document's own text holds none (character references included), so each placeholder occurs exactly once.
 */
export const renderWithEmbeds = (
  content: string,
  rendered: readonly (string | undefined)[],
  render: (markdown: string) => string,
): string => {
  const placed = rendered.filter((embed) => embed !== undefined).length;
  for (let nonce = 0; ; nonce++) {
    const placeholder = (index: number) => `DXEMBED${nonce}N${index}X`;
    const html = render(
      replaceEmbeds(content, (_, index) =>
        rendered[index] === undefined ? undefined : `\n\n${placeholder(index)}\n\n`,
      ),
    );
    if ((html.match(new RegExp(`DXEMBED${nonce}N`, 'g'))?.length ?? 0) !== placed) {
      continue;
    }

    return rendered.reduce<string>(
      // A function replacer, since a string one would expand `$` sequences in the embed's HTML.
      (result, embed, index) =>
        embed === undefined
          ? result
          : result.replace(`<p>${placeholder(index)}</p>`, () => embed).replace(placeholder(index), () => embed),
      html,
    );
  }
};
