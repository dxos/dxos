//
// Copyright 2026 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';

import { type Block, createBlockDrag } from './drag';
import { createBlockOutline } from './outline';

export type BlockOptions = {
  /** Class applied to each block box element. */
  className?: string;
  /**
   * Pin the drag preview to the block's left edge so it only tracks vertically (default `true`).
   * When `false`, the preview follows the pointer on both axes.
   */
  clampX?: boolean;
};

/**
 * Renders each top-level markdown block as a non-interactive box behind the text, with a gutter drag
 * handle to reorder blocks. Composes the two independent extensions `blockOutline` (the boxes) and
 * `blockDrag` (the handle + drag-to-move); use them separately to get one behaviour without the other.
 */
export const blocks = ({ className, clampX }: BlockOptions = {}): Extension => [
  blockOutline({ className }),
  blockDrag({ clampX }),
];

/**
 * Draws a non-interactive box behind each top-level markdown block. See `createBlockOutline`.
 */
export const blockOutline = ({ className }: Pick<BlockOptions, 'className'> = {}): Extension =>
  createBlockOutline({ getBlocks: findBlocks, className });

/**
 * Adds a gutter drag handle to each top-level markdown block and moves the block on drop. See
 * `createBlockDrag`.
 */
export const blockDrag = ({ clampX }: Pick<BlockOptions, 'clampX'> = {}): Extension =>
  createBlockDrag({ getBlocks: findBlocks, moveBlock, clampX });

/**
 * Top-level markdown blocks (headings, paragraphs, lists, blockquotes, fenced code, …) from the
 * syntax tree, so a list or code fence moves and boxes as a single unit. Memoized per state — the
 * outline layer, the gutter, and the drag plugin all query it on the same state.
 */
const blockCache = new WeakMap<EditorState, Block[]>();

const findBlocks = (state: EditorState): Block[] => {
  const cached = blockCache.get(state);
  if (cached) {
    return cached;
  }

  const blocks: Block[] = [];
  const cursor = syntaxTree(state).topNode.cursor();
  if (cursor.firstChild()) {
    do {
      if (cursor.to > cursor.from) {
        blocks.push({ from: cursor.from, to: cursor.to });
      }
    } while (cursor.nextSibling());
  }

  blockCache.set(state, blocks);
  return blocks;
};

/**
 * Moves the block at `sourceIndex` to the slot before `dropIndex` (or the end of the document when
 * `dropIndex === blocks.length`), preserving blank-line separation. Expressed as a minimal
 * delete + insert so it is a single undo step and syncs as a small edit through the data extension.
 */
const moveBlock = (view: EditorView, sourceIndex: number, dropIndex: number): void => {
  const { state } = view;
  const blocks = findBlocks(state);
  const count = blocks.length;
  // Dropping into the block's own slot (before itself or before its successor) is a no-op.
  if (sourceIndex < 0 || sourceIndex >= count || dropIndex === sourceIndex || dropIndex === sourceIndex + 1) {
    return;
  }

  const source = blocks[sourceIndex];
  const text = state.doc.sliceString(source.from, source.to);

  // Remove the block together with one adjacent separator so no blank line is orphaned.
  const deleteFrom = sourceIndex + 1 < count ? source.from : blocks[sourceIndex - 1].to;
  const deleteTo = sourceIndex + 1 < count ? blocks[sourceIndex + 1].from : source.to;

  // Insert before the drop-target block, or append at the end.
  const insertAt = dropIndex < count ? blocks[dropIndex].from : state.doc.length;
  const insert = dropIndex < count ? `${text}\n\n` : `\n\n${text}`;
  if (insertAt > deleteFrom && insertAt < deleteTo) {
    return;
  }

  // Sort the two changes by position (CodeMirror requires ascending, non-overlapping specs).
  const changes =
    insertAt <= deleteFrom
      ? [
          { from: insertAt, insert },
          { from: deleteFrom, to: deleteTo },
        ]
      : [
          { from: deleteFrom, to: deleteTo },
          { from: insertAt, insert },
        ];

  view.dispatch({ changes, userEvent: 'move.block' });
};
