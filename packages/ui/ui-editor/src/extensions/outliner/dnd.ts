//
// Copyright 2026 DXOS.org
//

import { type EditorState, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { type Block, type BlockOps, createBlockDrag, createBlockSelection, setBlockSelection } from '../blocks';
import { type Item, type Tree, getRange, treeFacet } from './tree';

// Narrower than the markdown block gutter — outliner items are indented and tightly packed.
const GUTTER_CLASS = 'cm-outlinerDragGutter';

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

  // Caret at the end of the moved item, and clear the block selection.
  const changeSet = state.changes(changes);
  const insertStart = changeSet.mapPos(insertAt, -1);
  const caret = insertStart + (dropIndex < count ? text.length : 1 + text.length);
  view.dispatch({
    changes,
    selection: { anchor: Math.min(caret, changeSet.newLength) },
    effects: setBlockSelection.of([]),
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

// Delete ranges for the given items: each item's own lines plus the newline below it (down to the next
// item, or the document end), merged so adjacent selections form one range.
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
 * Moves the items at `sourceIndices` to the slot before `dropIndex`. A single item moves with its whole
 * subtree (re-indented — see `moveItem`); multiple items move by their own lines as a group (a
 * best-effort for multi-selection reorder).
 */
const moveBlocks = (view: EditorView, sourceIndices: number[], dropIndex: number): void => {
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
  const insertStart = changeSet.mapPos(insertAt, -1);
  const caret = insertStart + (dropIndex < count ? text.length : 1 + text.length);
  view.dispatch({
    changes,
    selection: { anchor: Math.min(caret, changeSet.newLength) },
    effects: setBlockSelection.of([]),
    userEvent: 'move.item',
  });
};

/** Removes the items at `indices`, optionally replacing the first slot with `text` (paste). */
const replaceBlocks = (view: EditorView, indices: number[], text: string | null): void => {
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
 * the whole subtree (re-indented); the generic block-selection and clipboard from the `blocks`
 * extensions operate on item lines. The gutter is narrower — outliner items are indented and packed.
 */
export const outlinerDnd = (): Extension => [
  createBlockSelection(outlinerBlockOps),
  createBlockDrag({ getBlocks, moveBlocks, gutterClass: GUTTER_CLASS }),
  EditorView.theme({
    [`.${GUTTER_CLASS}`]: {
      width: '24px',
    },
  }),
];
