//
// Copyright 2026 DXOS.org
//

import { Chunk, unifiedMergeView } from '@codemirror/merge';
import { type Extension, Text } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

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

/** A changed hunk between two documents as character ranges in each (A = original, B = modified). */
export type Hunk = { fromA: number; toA: number; fromB: number; toB: number };

/**
 * Compute the changed hunks between `original` (A) and `modified` (B) as character ranges. Used to
 * locate and apply an individual change (e.g. accepting one hunk from a branch) outside an editor.
 */
export const computeHunks = (original: string, modified: string): Hunk[] =>
  Chunk.build(Text.of(original.split('\n')), Text.of(modified.split('\n'))).map((chunk) => ({
    fromA: chunk.fromA,
    toA: chunk.toA,
    fromB: chunk.fromB,
    toB: chunk.toB,
  }));

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
  const hunk = computeHunks(compare, current).find((h) => h.fromB < range.end && h.toB > range.start);
  if (!hunk) {
    return undefined;
  }
  return {
    from: hunk.fromB,
    del: Math.min(hunk.toB, current.length) - hunk.fromB,
    insert: compare.slice(hunk.fromA, Math.min(hunk.toA, compare.length)),
  };
};
