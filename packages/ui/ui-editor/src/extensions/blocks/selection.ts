//
// Copyright 2026 DXOS.org
//

import { type EditorState, type Extension, Prec, StateEffect, StateField } from '@codemirror/state';
import { EditorView, RectangleMarker, keymap, layer } from '@codemirror/view';

import { type Block } from './types';

// Amount (px) the highlight extends left of the content, matching the outline boxes and drag preview.
const BOX_INSET_X = 8;
const BOX_PADDING = 2;

/**
 * Operations a document supplies so whole blocks can be selected, reordered, and cut/copy/pasted. The
 * same contract backs markdown top-level blocks and outliner items — nothing here is markdown-specific.
 */
export type BlockOps = {
  /** Blocks in document order; ranges non-overlapping. Should be memoized per state. */
  getBlocks: (state: EditorState) => Block[];
  /**
   * Moves the blocks at `sourceIndices` to the slot before `dropIndex` (the end when
   * `dropIndex === blocks.length`), preserving their relative order, as a single edit.
   */
  moveBlocks: (view: EditorView, sourceIndices: number[], dropIndex: number) => void;
  /** Serializes blocks to clipboard text (markdown joins with a blank line; the outliner with newlines). */
  serialize: (state: EditorState, blocks: Block[]) => string;
  /**
   * Removes the blocks at `indices` and, when `text` is non-null, inserts it as block(s) at the first
   * removed slot — as a single edit. `text === null` is a pure delete (cut); non-null is a replace (paste).
   */
  replaceBlocks: (view: EditorView, indices: number[], text: string | null) => void;
};

//
// State: the block selection is an ordered set of block anchors (each block's `from`), kept sorted.
// Positions — not indices — so the set survives edits (mapped through changes).
//

/** Replaces the whole block selection. */
export const setBlockSelection = StateEffect.define<readonly number[]>();

/** Adds/removes a single block anchor, keeping the rest. */
export const toggleBlockSelection = StateEffect.define<number>();

const hasSelectionEffect = (effects: readonly StateEffect<any>[]): boolean =>
  effects.some((effect) => effect.is(setBlockSelection) || effect.is(toggleBlockSelection));

export const blockSelectionField = StateField.define<readonly number[]>({
  create: () => [],
  update: (value, tr) => {
    // Our own effects take precedence and are the only way to grow the selection.
    if (hasSelectionEffect(tr.effects)) {
      let next = value;
      for (const effect of tr.effects) {
        if (effect.is(setBlockSelection)) {
          next = [...effect.value].sort((a, b) => a - b);
        } else if (effect.is(toggleBlockSelection)) {
          const set = new Set(next);
          set.has(effect.value) ? set.delete(effect.value) : set.add(effect.value);
          next = [...set].sort((a, b) => a - b);
        }
      }
      return next;
    }

    if (value.length === 0) {
      return value;
    }

    // Keep anchors aligned through edits (a consumer re-resolves them against `getBlocks`). Caret moves
    // (keyboard nav) keep the selection so it can be extended; a plain text click clears it (see below).
    if (tr.docChanged) {
      return value.map((pos) => tr.changes.mapPos(pos, -1));
    }

    return value;
  },
});

/** Resolves the selection anchors to `{ block, index }` in document order, dropping stale anchors. */
export const getSelectedBlocks = (
  state: EditorState,
  getBlocks: BlockOps['getBlocks'],
): { block: Block; index: number }[] => {
  const anchors = state.field(blockSelectionField, false);
  if (!anchors || anchors.length === 0) {
    return [];
  }
  const byFrom = new Map(getBlocks(state).map((block, index) => [block.from, { block, index }]));
  const result: { block: Block; index: number }[] = [];
  for (const anchor of anchors) {
    const match = byFrom.get(anchor);
    if (match) {
      result.push(match);
    }
  }
  return result;
};

//
// Highlight (layer): a full-width tinted box behind each selected block, aligned with the outline boxes.
//

const buildSelectionMarkers = (view: EditorView, getBlocks: BlockOps['getBlocks']): RectangleMarker[] => {
  const selected = getSelectedBlocks(view.state, getBlocks);
  if (selected.length === 0) {
    return [];
  }

  const contentRect = view.contentDOM.getBoundingClientRect();
  const gutterOffset = contentRect.left - view.scrollDOM.getBoundingClientRect().left;
  const markers: RectangleMarker[] = [];
  for (const { block } of selected) {
    const from = Math.max(block.from, view.viewport.from);
    const to = Math.min(block.to, view.viewport.to);
    if (from > to) {
      continue;
    }
    const firstLine = view.lineBlockAt(from);
    const lastLine = view.lineBlockAt(to);
    markers.push(
      new RectangleMarker(
        'cm-blockSelected',
        gutterOffset - BOX_INSET_X,
        firstLine.top - BOX_PADDING,
        contentRect.width + BOX_INSET_X,
        lastLine.bottom - firstLine.top + BOX_PADDING * 2,
      ),
    );
  }
  return markers;
};

const selectionChanged = (a: EditorState, b: EditorState): boolean =>
  a.field(blockSelectionField, false) !== b.field(blockSelectionField, false);

const selectionTheme = EditorView.theme({
  '.cm-blockSelectedLayer': {
    pointerEvents: 'none',
  },
  '.cm-blockSelected': {
    boxSizing: 'border-box',
    backgroundColor: 'color-mix(in oklch, var(--color-accent-text, #3b82f6) 12%, transparent)',
  },
});

//
// Clipboard: cut/copy/paste act on the block selection; when it is empty they fall through to native
// text behavior. Mod-C/X/V route through these same DOM events, so no separate keymap is needed.
//

const clipboardHandlers = (ops: BlockOps): Extension =>
  EditorView.domEventHandlers({
    copy: (event, view) => {
      const selected = getSelectedBlocks(view.state, ops.getBlocks);
      if (selected.length === 0) {
        return false;
      }
      event.clipboardData?.setData(
        'text/plain',
        ops.serialize(
          view.state,
          selected.map((entry) => entry.block),
        ),
      );
      event.preventDefault();
      return true;
    },
    cut: (event, view) => {
      const selected = getSelectedBlocks(view.state, ops.getBlocks);
      if (selected.length === 0) {
        return false;
      }
      event.clipboardData?.setData(
        'text/plain',
        ops.serialize(
          view.state,
          selected.map((entry) => entry.block),
        ),
      );
      event.preventDefault();
      // `replaceBlocks` clears the block selection within its own transaction.
      ops.replaceBlocks(
        view,
        selected.map((entry) => entry.index),
        null,
      );
      return true;
    },
    paste: (event, view) => {
      const selected = getSelectedBlocks(view.state, ops.getBlocks);
      if (selected.length === 0) {
        return false;
      }
      const text = event.clipboardData?.getData('text/plain') ?? '';
      event.preventDefault();
      // Replace the selected blocks with the pasted text (`replaceBlocks` clears the block selection).
      ops.replaceBlocks(
        view,
        selected.map((entry) => entry.index),
        text,
      );
      return true;
    },
  });

// A plain press in the text clears the block selection (handle presses go through the gutter and don't
// hit `.cm-content`; shift-presses are left to extend the block selection via the gutter).
const clearOnTextPress = EditorView.domEventHandlers({
  mousedown: (event, view) => {
    if (event.shiftKey) {
      return false;
    }
    const target = event.target;
    const anchors = view.state.field(blockSelectionField, false);
    if (anchors && anchors.length > 0 && target instanceof Node && view.contentDOM.contains(target)) {
      view.dispatch({ effects: setBlockSelection.of([]) });
    }
    return false;
  },
});

// Escape clears the block selection. High precedence so it wins over other Escape bindings while a
// selection is active, but falls through (returns false) when there is nothing selected.
const clearOnEscape = Prec.high(
  keymap.of([
    {
      key: 'Escape',
      run: (view) => {
        const anchors = view.state.field(blockSelectionField, false);
        if (!anchors || anchors.length === 0) {
          return false;
        }
        view.dispatch({ effects: setBlockSelection.of([]) });
        return true;
      },
    },
  ]),
);

/**
 * Draws a border/background box behind each selected block, in a below-text layer re-measured on edits,
 * scrolling, and viewport changes. Separate from the selection state and clipboard so it can travel with
 * the drag grip (which populates the selection) independently of `createBlockSelection`. The blocks are
 * supplied by the caller (see `blockSelectionHighlight` for markdown top-level blocks).
 */
export const createBlockSelectionHighlight = (getBlocks: BlockOps['getBlocks']): Extension => [
  blockSelectionField,
  selectionTheme,
  layer({
    above: false,
    class: 'cm-blockSelectedLayer',
    update: (update) =>
      update.docChanged ||
      update.viewportChanged ||
      update.geometryChanged ||
      selectionChanged(update.startState, update.state),
    markers: (view) => buildSelectionMarkers(view, getBlocks),
  }),
];

/**
 * Whole-block selection state and cut/copy/paste over the selected blocks. The border/background behind
 * the selection is drawn by `createBlockSelectionHighlight`, and the gutter grip gestures that populate
 * the selection live in `createBlockDrag` (the handle is a gutter marker) — compose all three together.
 */
export const createBlockSelection = (ops: BlockOps): Extension => [
  blockSelectionField,
  clipboardHandlers(ops),
  clearOnTextPress,
  clearOnEscape,
];
