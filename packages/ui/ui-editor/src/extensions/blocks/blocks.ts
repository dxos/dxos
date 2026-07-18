//
// Copyright 2026 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';

import { type Block, createBlockDrag } from './drag';
import { createBlockOutline } from './outline';
import { type BlockOps, createBlockSelection } from './selection';

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
 * Renders each top-level markdown block as a non-interactive box behind the text, with block selection
 * (click/shift-click the gutter grip), drag-to-reorder, and block cut/copy/paste. Composes the
 * independent extensions `blockOutline` (the boxes), `blockSelection` (selection + clipboard), and
 * `blockDrag` (the grip + drag-to-move); use them separately for one behaviour without the others.
 */
export const blocks = ({ className, clampX }: BlockOptions = {}): Extension => [
  blockOutline({ className }),
  blockSelection(),
  blockDrag({ clampX }),
];

/**
 * Draws a non-interactive box behind each top-level markdown block. See `createBlockOutline`.
 */
export const blockOutline = ({ className }: Pick<BlockOptions, 'className'> = {}): Extension =>
  createBlockOutline({ getBlocks: findBlocks, className });

/**
 * Whole-block selection (gutter click/shift-click), highlight, and block cut/copy/paste over the
 * top-level markdown blocks. See `createBlockSelection`.
 */
export const blockSelection = (): Extension => createBlockSelection(markdownBlockOps);

/**
 * Adds a gutter drag grip to the active markdown block and moves the block (or the whole block
 * selection) on drop. See `createBlockDrag`.
 */
export const blockDrag = ({ clampX }: Pick<BlockOptions, 'clampX'> = {}): Extension =>
  createBlockDrag({ getBlocks: findBlocks, moveBlocks, clampX });

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

// Merges sorted ranges, combining any that overlap or touch.
const mergeRanges = (ranges: { from: number; to: number }[]): { from: number; to: number }[] => {
  const sorted = [...ranges].sort((a, b) => a.from - b.from);
  const merged: { from: number; to: number }[] = [];
  for (const range of sorted) {
    const last = merged.at(-1);
    if (last && range.from <= last.to) {
      last.to = Math.max(last.to, range.to);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
};

// Delete ranges for the given blocks: each block plus the blank-line separator below it (down to the next
// block, or the document end for the last block), merged so adjacent selections form one range.
const deleteRanges = (state: EditorState, blocks: Block[], indices: number[]): { from: number; to: number }[] => {
  const count = blocks.length;
  return mergeRanges(
    indices.map((index) => ({
      from: blocks[index].from,
      to: index + 1 < count ? blocks[index + 1].from : state.doc.length,
    })),
  );
};

/**
 * Moves the blocks at `sourceIndices` to the slot before `dropIndex` (the end of the document when
 * `dropIndex === blocks.length`), preserving their relative order and blank-line separation, as a single
 * undo step that syncs as a small edit.
 */
const moveBlocks = (view: EditorView, sourceIndices: number[], dropIndex: number): void => {
  const { state } = view;
  const blocks = findBlocks(state);
  const count = blocks.length;
  const sources = [...new Set(sourceIndices)].filter((index) => index >= 0 && index < count).sort((a, b) => a - b);
  // Dropping onto a selected block is a no-op.
  if (sources.length === 0 || sources.includes(dropIndex)) {
    return;
  }

  const text = sources.map((index) => state.doc.sliceString(blocks[index].from, blocks[index].to)).join('\n\n');
  const deletes = deleteRanges(state, blocks, sources);
  const insertAt = dropIndex < count ? blocks[dropIndex].from : state.doc.length;
  // Dropping inside the removed region is a no-op.
  if (deletes.some((range) => insertAt > range.from && insertAt < range.to)) {
    return;
  }

  const insert = dropIndex < count ? `${text}\n\n` : `\n\n${text}`;
  const changes = [...deletes.map((range) => ({ from: range.from, to: range.to })), { from: insertAt, insert }];
  view.dispatch({ changes, userEvent: 'move.block' });
};

/**
 * Removes the blocks at `indices` and, when `text` is non-null, inserts it as block(s) at the first
 * removed slot — as a single edit. `null` is a pure delete (cut); non-null is a replace (paste).
 */
const replaceBlocks = (view: EditorView, indices: number[], text: string | null): void => {
  const { state } = view;
  const blocks = findBlocks(state);
  const count = blocks.length;
  const sources = [...new Set(indices)].filter((index) => index >= 0 && index < count).sort((a, b) => a - b);
  if (sources.length === 0) {
    return;
  }

  const deletes = deleteRanges(state, blocks, sources);
  const changes = deletes.map(
    (range) => ({ from: range.from, to: range.to }) as { from: number; to: number; insert?: string },
  );
  let anchor = deletes[0].from;
  if (text != null && text.length > 0) {
    // Replace the first removed range with the pasted text (keeping a trailing blank unless at doc end).
    const insert = deletes[0].to >= state.doc.length ? text : `${text}\n\n`;
    changes[0] = { from: deletes[0].from, to: deletes[0].to, insert };
    anchor = deletes[0].from + text.length;
  }

  view.dispatch({
    changes,
    selection: { anchor: Math.min(anchor, state.doc.length) },
    userEvent: text == null ? 'delete.block' : 'input.paste',
  });
};

const markdownBlockOps: BlockOps = {
  getBlocks: findBlocks,
  moveBlocks,
  serialize: (state, blocks) => blocks.map((block) => state.doc.sliceString(block.from, block.to)).join('\n\n'),
  replaceBlocks,
};
