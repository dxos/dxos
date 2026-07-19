//
// Copyright 2026 DXOS.org
//

import { type EditorState, type Extension } from '@codemirror/state';
import { type Command, EditorView } from '@codemirror/view';

import {
  type Block,
  type BlockOps,
  blockSelectionField,
  createBlockDrag,
  createBlockSelection,
  setBlockSelection,
} from '../blocks';
import { type Item, type Tree, getRange, treeFacet } from './tree';

/**
 * Flattens the tree into draggable units in document order, one per item. Each unit spans only the
 * item's own lines (up to its first child), so the ranges are non-overlapping and every item — parent
 * or leaf — gets its own gutter handle. Memoized per state so the gutter and drag plugin share it.
 */
const itemCache = new WeakMap<EditorState, Item[]>();
const flattenItems = (state: EditorState): Item[] => {
  const cached = itemCache.get(state);
  if (cached) {
    return cached;
  }

  const tree = state.facet(treeFacet);
  const items: Item[] = [];
  tree.traverse((item) => {
    items.push(item);
  });

  itemCache.set(state, items);
  return items;
};

const getBlocks = (state: EditorState): Block[] =>
  flattenItems(state).map((item) => ({
    from: item.lineRange.from,
    // The item's own lines end just before its first child (or at its line range end for a leaf).
    to: item.children.length > 0 ? item.children[0].lineRange.from - 1 : item.lineRange.to,
  }));

// The range a block visually occupies for selection/drag: its whole subtree (item + descendants), so
// selecting or dragging a parent covers its children. `getBlocks` still yields per-item own-lines.
// Exported for tests.
export const getExtent = (state: EditorState, block: Block): Block => {
  const tree = state.facet(treeFacet);
  const item = tree.find(block.from);
  if (!item) {
    return block;
  }
  const [from, to] = getRange(tree, item);
  return { from, to };
};

/** Leading-whitespace width of the line at `pos` (indentation depth in characters). */
const indentAt = (state: EditorState, pos: number): number => {
  const text = state.doc.lineAt(pos).text;
  return text.length - text.trimStart().length;
};

/**
 * Re-roots `text` (a moved subtree) from `fromIndent` to `toIndent` by shifting every line's leading
 * whitespace, preserving the subtree's internal relative indentation. Keeps the moved item valid at
 * its new depth (e.g. dragging a nested task to the top level).
 */
const reindent = (text: string, fromIndent: number, toIndent: number): string => {
  const delta = toIndent - fromIndent;
  if (delta === 0) {
    return text;
  }
  return text
    .split('\n')
    .map((line) => {
      const existing = line.length - line.trimStart().length;
      const next = Math.max(0, existing + delta);
      return ' '.repeat(next) + line.slice(existing);
    })
    .join('\n');
};

/**
 * Moves the item at `sourceIndex` (with its whole subtree) to the slot before `dropIndex`, or to the
 * end of the document when `dropIndex === items.length`. Expressed as a minimal delete + insert so it
 * is a single undo step and syncs as a small edit.
 */
const moveItem = (view: EditorView, sourceIndex: number, dropIndex: number): void => {
  const { state } = view;
  const tree: Tree = state.facet(treeFacet);
  const items = flattenItems(state);
  const count = items.length;
  if (sourceIndex < 0 || sourceIndex >= count || dropIndex === sourceIndex) {
    return;
  }

  const source = items[sourceIndex];
  const [from, to] = getRange(tree, source);

  // Insert before the drop-target item, or append at the end.
  const insertAt = dropIndex < count ? items[dropIndex].lineRange.from : state.doc.length;
  // Dropping inside the item's own subtree (including immediately after its own line) is a no-op.
  if (insertAt > from && insertAt <= to) {
    return;
  }

  const sourceIndent = indentAt(state, from);
  const targetIndent = dropIndex < count ? indentAt(state, items[dropIndex].lineRange.from) : 0;
  const text = reindent(state.doc.sliceString(from, to), sourceIndent, targetIndent);

  // Remove the subtree together with one adjacent newline so no blank line is orphaned.
  const hasFollowing = to < state.doc.length;
  const deleteFrom = hasFollowing ? from : Math.max(0, from - 1);
  const deleteTo = hasFollowing ? Math.min(to + 1, state.doc.length) : to;
  const insert = dropIndex < count ? `${text}\n` : `\n${text}`;

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

  // Caret at the end of the moved item; keep the moved item selected (its new anchor is where the moved
  // text starts — the subtree's first line).
  const changeSet = state.changes(changes);
  const textStart = changeSet.mapPos(insertAt, -1) + (dropIndex < count ? 0 : 1);
  const caret = textStart + text.length;
  view.dispatch({
    changes,
    selection: { anchor: Math.min(caret, changeSet.newLength) },
    effects: setBlockSelection.of([textStart]),
    userEvent: 'move.item',
  });
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

// Delete ranges for the given items: each item's own lines plus its separating newline (the one below,
// down to the next item; for the last item the one above instead, so no trailing blank is orphaned),
// merged so adjacent selections form one range.
const deleteRanges = (state: EditorState, blocks: Block[], indices: number[]): { from: number; to: number }[] => {
  const count = blocks.length;
  return mergeRanges(
    indices.map((index) => ({
      from: index === count - 1 && index > 0 ? blocks[index - 1].to : blocks[index].from,
      to: index + 1 < count ? blocks[index + 1].from : state.doc.length,
    })),
  );
};

/**
 * Moves the items at `sourceIndices` to the slot before `dropIndex`. A single item moves with its whole
 * subtree (re-indented — see `moveItem`); multiple items move by their own lines as a group (a
 * best-effort for multi-selection reorder).
 */
// Exported for tests (the drag path calls this via `outlinerBlockOps`).
export const moveBlocks = (view: EditorView, sourceIndices: number[], dropIndex: number): void => {
  const { state } = view;
  const items = flattenItems(state);
  const count = items.length;
  const sources = [...new Set(sourceIndices)].filter((index) => index >= 0 && index < count).sort((a, b) => a - b);
  if (sources.length === 0 || sources.includes(dropIndex)) {
    return;
  }
  if (sources.length === 1) {
    moveItem(view, sources[0], dropIndex);
    return;
  }

  const blocks = getBlocks(state);
  const text = sources.map((index) => state.doc.sliceString(blocks[index].from, blocks[index].to)).join('\n');
  const deletes = deleteRanges(state, blocks, sources);
  const insertAt = dropIndex < count ? blocks[dropIndex].from : state.doc.length;
  if (deletes.some((range) => insertAt > range.from && insertAt < range.to)) {
    return;
  }

  const insert = dropIndex < count ? `${text}\n` : `\n${text}`;
  const changes = [...deletes.map((range) => ({ from: range.from, to: range.to })), { from: insertAt, insert }];
  const changeSet = state.changes(changes);
  const textStart = changeSet.mapPos(insertAt, -1) + (dropIndex < count ? 0 : 1);
  // Keep the moved items selected: their new anchors are the start of each item within the inserted
  // text, joined by a single newline (item length + 1). The caret lands at the end of the moved content.
  const anchors: number[] = [];
  let anchor = textStart;
  for (const index of sources) {
    anchors.push(anchor);
    anchor += blocks[index].to - blocks[index].from + 1;
  }
  const caret = textStart + text.length;
  view.dispatch({
    changes,
    selection: { anchor: Math.min(caret, changeSet.newLength) },
    effects: setBlockSelection.of(anchors),
    userEvent: 'move.item',
  });
};

/** Removes the items at `indices`, optionally replacing the first slot with `text` (paste). */
// Exported for tests (the drag/clipboard path calls this via `outlinerBlockOps`).
export const replaceBlocks = (view: EditorView, indices: number[], text: string | null): void => {
  const { state } = view;
  const blocks = getBlocks(state);
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
    const insert = deletes[0].to >= state.doc.length ? text : `${text}\n`;
    changes[0] = { from: deletes[0].from, to: deletes[0].to, insert };
    anchor = deletes[0].from + text.length;
  }

  view.dispatch({
    changes,
    selection: { anchor: Math.min(anchor, state.doc.length) },
    effects: setBlockSelection.of([]),
    userEvent: text == null ? 'delete.block' : 'input.paste',
  });
};

const outlinerBlockOps: BlockOps = {
  getBlocks,
  moveBlocks,
  serialize: (state, selected) => selected.map((block) => state.doc.sliceString(block.from, block.to)).join('\n'),
  replaceBlocks,
};

/**
 * Block selection, drag-to-reorder, and cut/copy/paste for outliner items. Single-item drag relocates
 * the whole subtree (re-indented); the generic block-selection and clipboard from the `blocks` extensions
 * operate on item lines. The grip is a floating overlay pinned to the content's left edge (see
 * `createBlockDrag`), so it needs no outliner-specific gutter styling.
 */
export const outlinerDnd = (): Extension => [
  // The selection highlight is drawn by `outliner.ts` as a line decoration (aligned to the actual rows);
  // the `blocks` RectangleMarker layer is skipped here because it drifts against the outliner's row CSS.
  createBlockSelection(outlinerBlockOps),
  createBlockDrag({ getBlocks, moveBlocks, getExtent, keepTrailingBreak: true }),
];

//
// Selection commands over the block selection (each item's line-start anchor). Replaces the outliner's
// former `selectionFacet`, so keyboard selection and the grip share one model.
//

const itemAnchors = (state: EditorState): number[] => flattenItems(state).map((item) => item.lineRange.from);

/** Select every item; pressing again (when all are selected) clears the selection. */
export const selectAllItems: Command = (view) => {
  const anchors = itemAnchors(view.state);
  const current = view.state.field(blockSelectionField, false) ?? [];
  view.dispatch({ effects: setBlockSelection.of(current.length === anchors.length ? [] : anchors) });
  return true;
};

/** Clear the block selection. */
export const selectNoneItems: Command = (view) => {
  view.dispatch({ effects: setBlockSelection.of([]) });
  return true;
};

// Extend the block selection by one item toward `delta`, moving the caret into the target item.
const extendSelection = (view: EditorView, delta: -1 | 1): boolean => {
  const items = flattenItems(view.state);
  const caret = view.state.selection.main.head;
  const index = items.findIndex((item) => caret >= item.lineRange.from && caret <= item.lineRange.to);
  if (index < 0) {
    return false;
  }
  const target = Math.min(items.length - 1, Math.max(0, index + delta));
  const anchors = new Set(view.state.field(blockSelectionField, false) ?? []);
  anchors.add(items[index].lineRange.from);
  anchors.add(items[target].lineRange.from);
  view.dispatch({
    selection: { anchor: items[target].contentRange.from },
    effects: setBlockSelection.of([...anchors].sort((a, b) => a - b)),
  });
  return true;
};

export const selectUp: Command = (view) => extendSelection(view, -1);
export const selectDown: Command = (view) => extendSelection(view, 1);
