//
// Copyright 2026 DXOS.org
//

import { Chunk, unifiedMergeView } from '@codemirror/merge';
import { type Extension, Text } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { diffChars, diffWordsWithSpace } from 'diff';

export type DiffOptions = {
  /**
   * The baseline document to diff against. The editor's own document is the modified side, so
   * insertions and deletions are shown relative to this original.
   */
  original: string;
};

/**
 * Orient the diff as a preview of accepting the original (the compared branch) into the editor's
 * document (the current branch): the compare branch's content — which the merge view renders as
 * deletions because it is absent from the editor — is what accepting ADDS, so show it as an addition;
 * the current branch's deviating content is what accepting REMOVES. This overrides the merge view's
 * default green-editor / red-original colouring, which reads inverted for branch review.
 */
const reviewOrientationTheme = EditorView.theme({
  '&.cm-merge-b .cm-changedLine, &.cm-merge-b .cm-changedText': {
    backgroundColor: 'var(--color-cm-diff-remove-surface)',
  },
  '& .cm-deletedChunk, & .cm-deletedChunk .cm-deletedText': {
    backgroundColor: 'var(--color-cm-diff-add-surface)',
    textDecoration: 'none',
  },
  // Keep the change-gutter markers aligned with the inverted content colours: the current branch's
  // deviations (removed on accept) gutter red, the compare branch's content (added on accept) green.
  '&.cm-merge-b .cm-changedLineGutter': { background: 'var(--color-cm-diff-remove-gutter)' },
  '& .cm-deletedLineGutter': { background: 'var(--color-cm-diff-add-gutter)' },
});

/**
 * Inline (unified) diff view: renders the editor's document with insertions and deletions marked
 * relative to {@link DiffOptions.original}. The editor stays editable — edits to the document update
 * the diff against the (static) original live — so it can overlay a live editor to compare the
 * current state against another version (e.g. another branch) without locking editing.
 */
export const diffView = ({ original }: DiffOptions): Extension => [
  unifiedMergeView({ original, mergeControls: false }),
  reviewOrientationTheme,
];

/**
 * A single reviewable change between `before` (the original) and `after` (the proposal), anchored in
 * the BEFORE text so it can be rendered as a suggestion over the original document and applied in
 * place. `[from, to)` is the original range the hunk replaces (`from === to` for a pure insertion);
 * `removed` is the original text in that range, `inserted` is the proposal text that replaces it.
 */
export type DiffHunk = {
  from: number;
  to: number;
  removed: string;
  inserted: string;
};

/**
 * Groups the word-level diff between `before` and `after` into contiguous {@link DiffHunk}s — each a
 * maximal run of insertions/deletions bounded by unchanged text. Used to render Google-Docs-style
 * suggestions (accept/reject per hunk) over the original document (see {@link suggestChanges}).
 */
export const diffHunks = (before: string, after: string): DiffHunk[] => {
  const hunks: DiffHunk[] = [];
  let position = 0;
  let pending: DiffHunk | undefined;
  const flush = () => {
    if (pending) {
      hunks.push(pending);
      pending = undefined;
    }
  };
  for (const change of diffWordsWithSpace(before, after)) {
    if (change.added) {
      pending ??= { from: position, to: position, removed: '', inserted: '' };
      pending.inserted += change.value;
    } else if (change.removed) {
      pending ??= { from: position, to: position, removed: '', inserted: '' };
      pending.removed += change.value;
      pending.to = position + change.value.length;
      position += change.value.length;
    } else {
      flush();
      position += change.value.length;
    }
  }
  flush();
  return hunks;
};

/**
 * Coalesce an author's adjacent {@link DiffHunk}s into one hunk per group, so a run of nearby edits
 * reviews as a single unit (e.g. one anchored card in the comment-style layer). Two hunks merge when
 * the unchanged `before` gap between them is at most `maxGap` characters; the merged hunk spans both
 * and absorbs the gap text into `removed` (and, unchanged, into `inserted`) so it still reconstructs
 * `after`. With `respectBlockBoundaries` (default) a gap containing a blank line (paragraph break) is
 * never bridged, keeping edits in different blocks as separate groups.
 *
 * `hunks` must be ordered and non-overlapping as {@link diffHunks} returns them. Defaults
 * (`maxGap: 0`) make grouping a no-op — each hunk is its own group — so callers opt into wider
 * coalescing explicitly.
 */
export type GroupPolicy = { maxGap?: number; respectBlockBoundaries?: boolean };

export const groupHunks = (hunks: DiffHunk[], before: string, policy: GroupPolicy = {}): DiffHunk[] => {
  const { maxGap = 0, respectBlockBoundaries = true } = policy;
  const groups: DiffHunk[] = [];
  for (const hunk of hunks) {
    const previous = groups.at(-1);
    const gap = previous ? before.slice(previous.to, hunk.from) : '';
    const bridgeable =
      previous !== undefined && gap.length <= maxGap && !(respectBlockBoundaries && /\n[ \t]*\n/.test(gap));
    if (bridgeable) {
      // Absorb the unchanged gap into both sides so the merged hunk still maps `removed` → `inserted`.
      previous.to = hunk.to;
      previous.removed += gap + hunk.removed;
      previous.inserted += gap + hunk.inserted;
    } else {
      groups.push({ ...hunk });
    }
  }
  return groups;
};

/**
 * Re-anchors {@link DiffHunk}s computed against `base` into `doc` coordinates, so a foreign author's
 * proposal (diffed `base` vs proposal) can be decorated over a `doc` that has itself diverged from
 * `base` (the user's own branch edits). Each hunk offset is mapped through the character-level
 * `base`↔`doc` diff ({@link computeCharHunks}): a position in an unchanged region shifts by the net
 * length of edits before it; a position inside a doc-edited region clamps to that region's edge (the
 * `from` to its start, the `to` to its end). Without this, a proposal diffed against `base` would
 * render at stale offsets over the diverged `doc`.
 */
export const rebaseHunks = (base: string, doc: string, hunks: DiffHunk[]): DiffHunk[] => {
  const charHunks = computeCharHunks(base, doc);
  const mapPos = (pos: number, side: -1 | 1): number => {
    let delta = 0;
    for (const hunk of charHunks) {
      if (pos < hunk.fromA) {
        break;
      }
      if (pos < hunk.toA) {
        // Inside a doc-edited region: clamp to its edge so the offset stays a valid doc position.
        return side < 0 ? hunk.fromB : hunk.toB;
      }
      // Past this region: `toB - toA` is the net offset shift it contributes.
      delta = hunk.toB - hunk.toA;
    }
    return pos + delta;
  };
  return hunks.map((hunk) => ({ ...hunk, from: mapPos(hunk.from, -1), to: mapPos(hunk.to, 1) }));
};

/** A changed hunk between two documents as character ranges in each (A = original, B = modified). */
export type Hunk = { fromA: number; toA: number; fromB: number; toB: number };

/**
 * LINE-level changed hunks between `original` (A) and `modified` (B) as character ranges (via
 * `@codemirror/merge` `Chunk.build`). Coarser than {@link computeWordHunks}; retained for callers that
 * want whole-line change regions.
 */
export const computeHunks = (original: string, modified: string): Hunk[] =>
  Chunk.build(Text.of(original.split('\n')), Text.of(modified.split('\n'))).map((chunk) => ({
    fromA: chunk.fromA,
    toA: chunk.toA,
    fromB: chunk.fromB,
    toB: chunk.toB,
  }));

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

/**
 * CHARACTER-level changed hunks between `original` (A) and `modified` (B), each carrying both
 * coordinate ranges. Finer than {@link computeWordHunks}: an in-word or whitespace/newline edit shows
 * only the changed characters, not a whole-word delete+insert. Used for live "Suggesting mode" tracked
 * changes (see {@link trackChanges}), where word granularity makes every keystroke read as a struck
 * word rebuilt beside it.
 */
export const computeCharHunks = (original: string, modified: string): Hunk[] => {
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
  for (const change of diffChars(original, modified)) {
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
  // Half-open overlap: a range touching a neighbouring hunk's boundary is not on that hunk.
  const hunk = computeWordHunks(compare, current).find((h) => h.fromB < range.end && h.toB > range.start);
  if (!hunk) {
    return undefined;
  }
  return {
    from: hunk.fromB,
    del: Math.min(hunk.toB, current.length) - hunk.fromB,
    insert: compare.slice(hunk.fromA, Math.min(hunk.toA, compare.length)),
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
  // A = base, B = compare (branch); locate the hunk by its base-side range.
  const hunk = computeWordHunks(base, compare).find((h) => h.fromA < baseRange.end && h.toA > baseRange.start);
  if (!hunk) {
    return undefined;
  }
  return {
    from: hunk.fromB,
    del: Math.min(hunk.toB, compare.length) - hunk.fromB,
    insert: base.slice(hunk.fromA, Math.min(hunk.toA, base.length)),
  };
};
