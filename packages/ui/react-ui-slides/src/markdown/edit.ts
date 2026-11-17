//
// Copyright 2026 DXOS.org
//

import * as Yaml from 'yaml';

import { parseFrontmatter } from './frontmatter.ts';
import { type SlotName } from './remark-slidev.ts';

/** A text replacement in a slide's markdown, with where the cursor should land afterwards. */
export type SlideEdit = { from: number; to: number; insert: string; cursor: number };

// The same leading block `remark-frontmatter` reads: `---` on the first line, YAML, then a closing `---`.
const FRONTMATTER = /^---[ \t]*\r?\n([\s\S]*?)\r?\n?---[ \t]*(?:\r?\n|$)/;

/** Whether a slide's frontmatter sets `hide: true`, which leaves it out when the deck is presented. */
export const isHiddenSlide = (content: string): boolean => {
  const match = FRONTMATTER.exec(content);
  return match ? parseFrontmatter(match[1]).frontmatter.hide === true : false;
};

/**
 * Sets (or, for `undefined`, removes) frontmatter keys, keeping the block's other keys, order and comments;
 * adds a block when the slide has none and removes it when it ends up empty.
 */
export const setFrontmatter = (
  content: string,
  patch: Record<string, string | number | boolean | undefined>,
): SlideEdit => {
  const match = FRONTMATTER.exec(content);
  const document = Yaml.parseDocument(match?.[1] ?? '');
  // Malformed YAML, or YAML that is not a mapping, cannot take a key; the slide is left as written.
  if (document.errors.length > 0 || (document.contents !== null && !Yaml.isMap(document.contents))) {
    return { from: 0, to: 0, insert: '', cursor: 0 };
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      document.delete(key);
    } else {
      document.set(key, value);
    }
  }
  const empty = document.contents === null || (Yaml.isMap(document.contents) && document.contents.items.length === 0);
  const body = match ? content.slice(match[0].length) : content;
  const block = empty ? '' : `---\n${document.toString().trimEnd()}\n---\n`;
  // A new block needs a blank line before the body, so the body's first line is not read as YAML.
  const insert = match || empty ? block : `${block}${body.startsWith('\n') ? '' : '\n'}`;
  const to = match ? match[0].length : 0;
  return { from: 0, to, insert, cursor: insert.length };
};

/** Markdown inserted by the toolbar; `|` marks where the cursor lands. */
export const SNIPPETS = {
  click: '<v-click>\n\n|\n\n</v-click>\n',
  clicks: '<v-clicks>\n\n- |\n\n</v-clicks>\n',
} as const;

/** A marker starting `slot`; `|` marks where the cursor lands. */
export const columnSnippet = (slot: SlotName) => `\n::${slot}::\n\n|`;

/** An embedded-object tag for the object's ECHO URI. */
export const surfaceSnippet = (uri: string) => `<Surface ref="${uri}" />\n|`;

/**
 * Inserts a snippet at `offset` (on a line of its own for block snippets), placing the cursor at its `|`.
 */
export const insertSnippet = (content: string, offset: number, snippet: string): SlideEdit => {
  const lineStart = content.lastIndexOf('\n', offset - 1) + 1;
  const atLineStart = content.slice(lineStart, offset).trim() === '';
  const prefix = atLineStart ? '' : '\n\n';
  const marker = snippet.indexOf('|');
  const text = prefix + snippet.replace('|', '');
  return { from: offset, to: offset, insert: text, cursor: offset + prefix.length + marker };
};

const TRAILING_COMMENT = /<!--([\s\S]*?)-->\s*$/;

/**
 * Puts the cursor inside the slide's speaker notes (its trailing HTML comment), adding an empty one first if
 * the slide has none.
 */
export const notesEdit = (content: string): SlideEdit => {
  const match = TRAILING_COMMENT.exec(content);
  if (match) {
    const end = match.index + 4 + match[1].trimEnd().length;
    return { from: end, to: end, insert: '', cursor: end };
  }
  const separator = content.length === 0 || content.endsWith('\n\n') ? '' : content.endsWith('\n') ? '\n' : '\n\n';
  const insert = `${separator}<!--\n\n-->\n`;
  return { from: content.length, to: content.length, insert, cursor: content.length + separator.length + 5 };
};

/** Applies an edit to a string, for tests and for callers without an editor view. */
export const applyEdit = (content: string, edit: SlideEdit): string =>
  content.slice(0, edit.from) + edit.insert + content.slice(edit.to);
