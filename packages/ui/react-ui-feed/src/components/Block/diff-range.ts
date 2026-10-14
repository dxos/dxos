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
