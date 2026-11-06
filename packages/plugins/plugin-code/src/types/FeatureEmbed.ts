//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { EID } from '@dxos/echo';

/**
 * One feature embedded in a spec document: `![label](echo:///<id>)` on a line of its own. The text is canonical for
 * which features a spec holds and in what order; the label is only a hint for a reader of the raw text.
 */
export type Embed = {
  /** Entity id of the embedded object. */
  id: string;
  uri: string;
  label: string;
  /** Offsets of the `![…](…)` source. */
  from: number;
  to: number;
};

/** A text change, as CodeMirror and `Doc.updateText` callers apply it. */
export type Change = { from: number; to?: number; insert?: string };

const EMBED = /!\[([^\]\n]*)\]\(((?:echo|eid):[^)\s]+)\)/g;
const FEATURES_HEADING = /^##[ \t]+Features[ \t]*$/m;
const HEADING = /^#{1,2}[ \t]/m;

/** Entity id of an object URI; space-qualified and local URIs may name the same object. */
export const entityId = (uri: string): string => {
  const eid = EID.tryParse(uri);
  return (eid && EID.getEntityId(eid)) ?? uri;
};

/** Every object embed in the text, in document order; whether each names a feature is the caller's to decide. */
export const parse = (text: string): Embed[] =>
  [...text.matchAll(EMBED)].map((match) => ({
    id: entityId(match[2]),
    uri: match[2],
    label: match[1],
    from: match.index,
    to: match.index + match[0].length,
  }));

/**
 * The embed source for an object; brackets in the label would end it early, so they are dropped, and an empty label
 * would leave it plain text, so it falls back to a word.
 */
export const make = ({ label, uri }: { label: string; uri: string }): string =>
  `![${label.replace(/[[\]\n]/g, '').trim() || 'feature'}](${uri})`;

/**
 * Where a new embed goes: the end of the `## Features` section when the text has one, else the end of the text. The
 * text is never given a section it lacks; structure is the author's to add.
 */
export const append = (text: string, embed: string): Change => {
  const heading = FEATURES_HEADING.exec(text);
  let at = text.length;
  if (heading) {
    const rest = text.slice(heading.index + heading[0].length);
    const next = HEADING.exec(rest);
    at = next ? heading.index + heading[0].length + next.index : text.length;
  }
  const before = text.slice(0, at).replace(/\s+$/, '');
  const after = text.slice(at).replace(/^\s+/, '');
  // Blank lines either side, so the embed is a paragraph of its own and parses as a block.
  return {
    from: before.length,
    to: text.length - after.length,
    insert: `${before.length > 0 ? '\n\n' : ''}${embed}\n${after.length > 0 ? '\n' : ''}`,
  };
};

/** Removes every embed of `id`, taking the line with it when the embed is all the line holds. */
export const remove = (text: string, id: string): Change[] =>
  parse(text)
    .filter((embed) => embed.id === id)
    .map(({ from, to }) => {
      const start = text.lastIndexOf('\n', from - 1) + 1;
      const end = text.indexOf('\n', to);
      const lineEnd = end === -1 ? text.length : end;
      const alone = text.slice(start, from).trim() === '' && text.slice(to, lineEnd).trim() === '';
      return alone ? { from: start, to: end === -1 ? text.length : end + 1 } : { from, to };
    });

/** Rewrites the label of every embed of `id`. */
export const relabel = (text: string, id: string, label: string): Change[] =>
  parse(text)
    .filter((embed) => embed.id === id && embed.label !== label)
    .map(({ from, to, uri }) => ({ from, to, insert: make({ label, uri }) }));

/** Applies changes, given in any order and not overlapping, to the text. */
export const apply = (text: string, changes: readonly Change[]): string =>
  [...changes]
    .sort((left, right) => right.from - left.from)
    .reduce((result, { from, to = from, insert = '' }) => result.slice(0, from) + insert + result.slice(to), text);
