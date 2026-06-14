//
// Copyright 2026 DXOS.org
//

import { unifiedMergeView } from '@codemirror/merge';
import { type Extension } from '@codemirror/state';

export type DiffOptions = {
  /**
   * The baseline document to diff against. The editor's own document is the modified side, so
   * insertions and deletions are shown relative to this original.
   */
  original: string;
};

/**
 * Inline (unified) diff view: renders the editor's document with insertions and deletions marked
 * relative to {@link DiffOptions.original}. The editor stays editable — edits to the document update
 * the diff against the (static) original live — so it can overlay a live editor to compare the
 * current state against another version (e.g. another branch) without locking editing.
 */
export const diffView = ({ original }: DiffOptions): Extension =>
  unifiedMergeView({ original, mergeControls: false });
