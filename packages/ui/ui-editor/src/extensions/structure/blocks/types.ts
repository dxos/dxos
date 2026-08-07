//
// Copyright 2026 DXOS.org
//

import { type EditorState } from '@codemirror/state';

/**
 * A contiguous document region that can be selected, dragged, and reordered as a unit. Lives in its own
 * module so `drag.ts` and `selection.ts` can share it without importing from each other (a cycle that
 * makes the dev bundler instantiate the shared state field twice).
 */
export type Block = {
  from: number;
  to: number;
};

/**
 * Maps a block to the document range it visually occupies for the selection highlight and drag
 * (collapse/preview/placeholder). Defaults to the block's own range; a hierarchical consumer (the
 * outliner) returns the block's whole subtree so selecting/dragging a parent covers its descendants.
 */
export type BlockExtent = (state: EditorState, block: Block) => Block;
