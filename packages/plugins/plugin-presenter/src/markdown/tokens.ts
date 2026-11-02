//
// Copyright 2026 DXOS.org
//

import { SLOT_LINE, fencedLines } from './split.ts';

/** What a span of slide markdown is, for highlighting the parts the slide DSL adds to markdown. */
export type SlideTokenKind =
  | 'frontmatter'
  | 'frontmatter-delimiter'
  | 'frontmatter-key'
  | 'slot'
  | 'tag'
  | 'tag-attribute'
  | 'embed'
  | 'notes';

export type SlideToken = { from: number; to: number; kind: SlideTokenKind };

const FRONTMATTER = /^(---)[ \t]*\r?\n([\s\S]*?)\r?\n?(---)[ \t]*(?:\r?\n|$)/;
const YAML_KEY = /^([A-Za-z_][\w-]*)\s*:/;
const TAG = /<\/?(?:v-clicks?|v-after|Surface)\b[^<>]*>/g;
const ATTRIBUTE = /\s([A-Za-z_][\w-]*)(?==)/g;
const EMBED = /!\[[^\]]*\]\((?:echo|eid):[^)\s]+\)/g;
// The body may not contain `-->`, so an earlier comment cannot extend the match into the trailing notes.
const NOTES = /<!--(?:(?!-->)[\s\S])*-->\s*$/;

/**
 * The slide DSL's spans in one slide's markdown, in document order: the frontmatter block (with its delimiters and
 * keys), `::slot::` markers, click and `Surface` tags (with their attribute names), object embeds and the trailing
 * speaker notes. Fenced code is skipped, since everything in it is literal.
 */
export const slideTokens = (content: string): SlideToken[] => {
  const tokens: SlideToken[] = [];

  let bodyStart = 0;
  const frontmatter = FRONTMATTER.exec(content);
  if (frontmatter) {
    const closeAt = frontmatter[0].lastIndexOf('---');
    tokens.push({ from: 0, to: frontmatter[0].length, kind: 'frontmatter' });
    tokens.push({ from: 0, to: 3, kind: 'frontmatter-delimiter' });
    let offset = frontmatter[0].indexOf('\n') + 1;
    for (const line of frontmatter[2].split('\n')) {
      const key = YAML_KEY.exec(line);
      if (key) {
        tokens.push({ from: offset, to: offset + key[1].length, kind: 'frontmatter-key' });
      }
      offset += line.length + 1;
    }
    tokens.push({ from: closeAt, to: closeAt + 3, kind: 'frontmatter-delimiter' });
    bodyStart = frontmatter[0].length;
  }

  const notes = NOTES.exec(content.slice(bodyStart));
  const notesFrom = notes ? bodyStart + notes.index : content.length;

  const lines = content.slice(bodyStart).split('\n');
  const fenced = fencedLines(lines);
  let lineStart = bodyStart;
  lines.forEach((line, index) => {
    const from = lineStart;
    lineStart += line.length + 1;
    if (fenced[index] || from >= notesFrom) {
      return;
    }
    if (SLOT_LINE.test(line)) {
      tokens.push({ from, to: from + line.length, kind: 'slot' });
      return;
    }
    for (const tag of line.matchAll(TAG)) {
      const tagFrom = from + tag.index;
      tokens.push({ from: tagFrom, to: tagFrom + tag[0].length, kind: 'tag' });
      for (const attribute of tag[0].matchAll(ATTRIBUTE)) {
        const attributeFrom = tagFrom + attribute.index + 1;
        tokens.push({ from: attributeFrom, to: attributeFrom + attribute[1].length, kind: 'tag-attribute' });
      }
    }
    for (const embed of line.matchAll(EMBED)) {
      tokens.push({ from: from + embed.index, to: from + embed.index + embed[0].length, kind: 'embed' });
    }
  });

  if (notes) {
    tokens.push({ from: notesFrom, to: notesFrom + notes[0].trimEnd().length, kind: 'notes' });
  }

  // Decorations must be added in document order, and a span's own parts after the span that holds them.
  return tokens.sort((a, b) => a.from - b.from || b.to - a.to);
};

/**
 * The markers the editor treats as one unit, so the caret steps over and deletes them whole: `::slot::` markers and
 * click tags without attributes. A tag with attributes (`<Surface ref="…">`, `<v-click at="2">`) stays editable.
 */
export const atomicTokens = (tokens: readonly SlideToken[]): SlideToken[] =>
  tokens.filter(
    (token) =>
      token.kind === 'slot' ||
      (token.kind === 'tag' &&
        !tokens.some((part) => part.kind === 'tag-attribute' && part.from >= token.from && part.to <= token.to)),
  );
