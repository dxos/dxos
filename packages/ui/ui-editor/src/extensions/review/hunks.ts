//
// Copyright 2026 DXOS.org
//

// No CodeMirror import: this module backs `@dxos/ui-editor/hunks`, which server operation handlers load.

import { diffWordsWithSpace } from 'diff';

/** A changed hunk between two documents as character ranges in each (A = original, B = modified). */
export type Hunk = { fromA: number; toA: number; fromB: number; toB: number };

/**
 * WORD-level changed hunks between `original` (A) and `modified` (B), each carrying both coordinate
 * ranges. Matches the word granularity of {@link diffHunks} (same `diffWordsWithSpace` alignment), so
 * {@link cherryPickHunk} / {@link revertHunk} resolve exactly the anchored word(s) — accepting one
 * word does not pull in the rest of its line.
 */
export const computeWordHunks = (original: string, modified: string): Hunk[] => {
  const hunks: Hunk[] = [];
  let positionA = 0;
  let positionB = 0;
  let pending: Hunk | undefined;
  const flush = () => {
    if (pending) {
      hunks.push(pending);
      pending = undefined;
    }
  };
  for (const change of diffWordsWithSpace(original, modified)) {
    if (change.added) {
      pending ??= { fromA: positionA, toA: positionA, fromB: positionB, toB: positionB };
      positionB += change.value.length;
      pending.toB = positionB;
    } else if (change.removed) {
      pending ??= { fromA: positionA, toA: positionA, fromB: positionB, toB: positionB };
      positionA += change.value.length;
      pending.toA = positionA;
    } else {
      flush();
      positionA += change.value.length;
      positionB += change.value.length;
    }
  }
  flush();
  return hunks;
};

const overlaps = (from: number, to: number, range: { start: number; end: number }): boolean =>
  from === to || range.start === range.end
    ? from <= range.end && to >= range.start
    : from < range.end && to > range.start;

/**
 * Resolve a single change to apply when cherry-picking from `compare` (A) into `current` (B): find
 * the hunk overlapping `range` (a character range in `current`) and return the splice that replaces
 * that hunk's current text with the compare version. Returns undefined if no hunk overlaps the range
 * (e.g. the change was already applied/reverted). `compare` is read live by the caller, so applying
 * the result always reflects the latest diff — not a snapshot.
 */
export const cherryPickHunk = (
  current: string,
  compare: string,
  range: { start: number; end: number },
): { from: number; del: number; insert: string } | undefined => {
  // Merge EVERY hunk the range overlaps into one splice: a range spanning a delimiter pair (two
  // word-hunks wrapping unchanged text) must apply atomically — half an accepted pair is broken
  // syntax. A cursor-anchored range still resolves a single hunk, unchanged.
  const matched = computeWordHunks(compare, current).filter((h) => overlaps(h.fromB, h.toB, range));
  if (matched.length === 0) {
    return undefined;
  }
  const first = matched[0];
  const last = matched[matched.length - 1];
  return {
    from: first.fromB,
    del: Math.min(last.toB, current.length) - first.fromB,
    insert: compare.slice(first.fromA, Math.min(last.toA, compare.length)),
  };
};

/**
 * Resolve the splice that reverts a single change on `compare` (a branch) back to `base` (main) —
 * the reject counterpart to {@link cherryPickHunk}. `baseRange` is a character range in `base`; the
 * hunk overlapping it is located and the returned splice (in `compare` coordinates) replaces the
 * branch's version with the base text. Returns undefined if no hunk overlaps the range.
 */
export const revertHunk = (
  base: string,
  compare: string,
  baseRange: { start: number; end: number },
): { from: number; del: number; insert: string } | undefined => {
  // A = base, B = compare (branch); locate the hunks by the base-side range and merge them so a
  // pair-spanning reject reverts the whole formatting action (mirror of cherryPickHunk).
  const matched = computeWordHunks(base, compare).filter((h) => overlaps(h.fromA, h.toA, baseRange));
  if (matched.length === 0) {
    return undefined;
  }
  const first = matched[0];
  const last = matched[matched.length - 1];
  return {
    from: first.fromB,
    del: Math.min(last.toB, compare.length) - first.fromB,
    insert: base.slice(first.fromA, Math.min(last.toA, base.length)),
  };
};
