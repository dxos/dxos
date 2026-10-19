//
// Copyright 2026 DXOS.org
//

/** One replacement taking `from` to `to`, as a CodeMirror change spec. */
export type RangeChange = { from: number; to: number; insert: string };

/**
 * The smallest single replacement that turns `before` into `after`: the common prefix and suffix
 * are left alone, so a document whose middle changed keeps the decorations either side of it.
 */
export const diffRange = (before: string, after: string): RangeChange => {
  const limit = Math.min(before.length, after.length);
  let prefix = 0;
  while (prefix < limit && before.charCodeAt(prefix) === after.charCodeAt(prefix)) {
    prefix++;
  }

  // Bounded by the prefix, so a repeated run is never counted on both sides.
  let suffix = 0;
  while (
    suffix < limit - prefix &&
    before.charCodeAt(before.length - 1 - suffix) === after.charCodeAt(after.length - 1 - suffix)
  ) {
    suffix++;
  }

  return { from: prefix, to: before.length - suffix, insert: after.slice(prefix, after.length - suffix) };
};

/** The part of a CodeMirror `Text` that {@link syncChange} reads. */
export type DocLike = { length: number; sliceString: (from: number, to?: number) => string; toString: () => string };

/** Characters of the document's tail compared before trusting an append. */
const TAIL = 64;

/**
 * The change that takes `doc` to `text`: an append when the document still ends where `text` has it
 * (cheap to check, and the common case), else the smallest replacement, so a document that has drifted
 * from what its caller believes is resynced rather than written past its end.
 */
export const syncChange = (doc: DocLike, text: string): RangeChange => {
  const start = Math.max(0, doc.length - TAIL);
  return doc.length <= text.length && doc.sliceString(start) === text.slice(start, doc.length)
    ? { from: doc.length, to: doc.length, insert: text.slice(doc.length) }
    : diffRange(doc.toString(), text);
};
