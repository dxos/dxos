//
// Copyright 2026 DXOS.org
//

import { type EditorState, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { type Block, createBlockDrag } from '../blocks';
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

  view.dispatch({ changes, userEvent: 'move.item' });
};

/**
 * Drag-to-reorder for outliner items. Adds a gutter grip to each item and, on drop, relocates the
 * item and its subtree. Reuses the generic block-drag core (preview, drop indicator, auto-scroll)
 * from the `blocks` extensions with tree-aware blocks and move semantics.
 */
export const outlinerDnd = (): Extension => [
  createBlockDrag({ getBlocks, moveBlock: moveItem, gutterClass: GUTTER_CLASS }),
  EditorView.theme({
    [`.${GUTTER_CLASS}`]: {
      width: '24px',
    },
  }),
];
