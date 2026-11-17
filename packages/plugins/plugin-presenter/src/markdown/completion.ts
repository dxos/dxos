//
// Copyright 2026 DXOS.org
//

import { FRONTMATTER_KEYS, FRONTMATTER_VALUES, type FrontmatterKey, type LayoutName, isLayout } from './frontmatter.ts';
import { slideTokens } from './tokens.ts';

/** What the caret is in the middle of: a key on its own line, or the value after one. */
export type FrontmatterCompletionKind = 'key' | 'value';

export type FrontmatterCompletion = {
  /** Start of the text the completion replaces. */
  from: number;
  /** End of it: the rest of the word after the caret, so accepting one mid-word replaces it rather than doubling it. */
  to: number;
  /** The text typed so far, which the options are filtered by. */
  prefix: string;
  kind: FrontmatterCompletionKind;
  /** The key whose value is being completed; absent while completing a key. */
  key?: FrontmatterKey;
  options: readonly string[];
};

/** The end of the word the caret sits in: what a completion replaces along with the text before it. */
const wordEnd = (content: string, pos: number): number => {
  const lineEnd = content.indexOf('\n', pos);
  const rest = content.slice(pos, lineEnd < 0 ? content.length : lineEnd);
  return pos + (/^[\w-]*/.exec(rest)?.[0].length ?? 0);
};

/** A key on its own line, with nothing typed after it yet. */
const KEY = /^([A-Za-z_][\w-]*)?$/;

/** A key, its colon, and the value typed so far. */
const VALUE = /^([A-Za-z_][\w-]*):[ \t]*(["']?)([\w-]*)$/;

/** The keys already written on another line, so each one is offered once. */
const usedKeys = (block: string, lineStart: number, blockStart: number): Set<string> => {
  const keys = new Set<string>();
  let offset = blockStart;
  for (const line of block.split('\n')) {
    const key = /^([A-Za-z_][\w-]*):/.exec(line);
    if (key && offset !== lineStart) {
      keys.add(key[1]);
    }
    offset += line.length + 1;
  }
  return keys;
};

/**
 * The completion for the frontmatter at `pos`, while the caret is inside the slide's frontmatter block: the keys it
 * takes while one is being typed on its own line, and the values of a key whose values are a fixed set (`layout`,
 * `theme`, `bleed`, `hide`, and the two background options). Elsewhere, and for a key whose value is free text such
 * as a color or a URL, there is nothing to complete.
 */
export const frontmatterCompletion = (content: string, pos: number): FrontmatterCompletion | null => {
  const frontmatter = slideTokens(content).find((token) => token.kind === 'frontmatter');
  if (!frontmatter || pos <= frontmatter.from || pos >= frontmatter.to) {
    return null;
  }

  const lineStart = content.lastIndexOf('\n', pos - 1) + 1;
  const typed = content.slice(lineStart, pos);

  const value = VALUE.exec(typed);
  if (value) {
    const [, key, , prefix] = value;
    // `hasOwn`, since a key naming something on the prototype (`constructor:`) would otherwise read a function
    // off it, pass the guard, and throw where the options are filtered.
    const options = Object.hasOwn(FRONTMATTER_VALUES, key) ? FRONTMATTER_VALUES[key as FrontmatterKey] : undefined;
    if (!options) {
      return null;
    }
    return {
      from: pos - prefix.length,
      to: wordEnd(content, pos),
      prefix,
      kind: 'value',
      key: key as FrontmatterKey,
      options: options.filter((option) => option.startsWith(prefix)),
    };
  }

  const key = KEY.exec(typed);
  // Only where the key would be the whole line: completing into the middle of `lay|out: cover` would double it.
  const lineEnd = content.indexOf('\n', pos);
  if (!key || content.slice(pos, lineEnd < 0 ? content.length : lineEnd).trim().length > 0) {
    return null;
  }
  const prefix = key[1] ?? '';
  // The delimiters are part of the block, so the opening `---` line is never a key line.
  if (content.slice(lineStart, lineStart + 3) === '---') {
    return null;
  }
  const used = usedKeys(content.slice(frontmatter.from, frontmatter.to), lineStart, frontmatter.from);
  return {
    from: pos - prefix.length,
    to: wordEnd(content, pos),
    prefix,
    kind: 'key',
    options: FRONTMATTER_KEYS.filter((option) => option.startsWith(prefix) && !used.has(option)),
  };
};

/**
 * The completion's options as layouts, when it is offering them, so a caller can describe each by name; undefined
 * for anything else. A predicate would only narrow the completion, not the `string[]` its options are declared as.
 */
export const layoutOptions = (completion: FrontmatterCompletion): readonly LayoutName[] | undefined =>
  completion.kind === 'value' && completion.key === 'layout' ? completion.options.filter(isLayout) : undefined;
