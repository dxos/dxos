//
// Copyright 2026 DXOS.org
//

import { type EditorState, type Extension } from '@codemirror/state';
import { EditorView, RectangleMarker, layer } from '@codemirror/view';

import { type Block } from './drag';

export type BlockOutlineOptions = {
  /** Enumerates the blocks to outline for a state, in document order. */
  getBlocks: (state: EditorState) => Block[];
  /** Class applied to each block box element (default `cm-block`). */
  className?: string;
};

const DEFAULT_CLASS = 'cm-block';

// Space (px) between the text bounds and the box border, applied above and below.
const BOX_PADDING = 2;

// Amount (px) the box extends left of the content, into the gutter, so its left border is not flush
// against the text. Only the left edge moves — extending right would grow the scroller and add a
// horizontal scrollbar, and the text stays put.
const BOX_INSET_X = 8;

/**
 * Builds one full-width rectangle per visible block. `RectangleMarker` coordinates are relative to
 * CodeMirror's layer origin, which is the scroller's left edge (before the gutter) — so the box is
 * offset right by the content's distance from the scroller (the gutter width) to align with the text.
 * The vertical origin is the content top. Bounds come from `lineBlockAt` — the same line-block
 * geometry the gutter (and thus the drag handle) uses — so the box top aligns with the handle and the
 * box encloses a tall styled line (heading), which `coordsAtPos` under-reports.
 */
const buildMarkers = (
  view: EditorView,
  getBlocks: BlockOutlineOptions['getBlocks'],
  className: string,
): RectangleMarker[] => {
  const contentRect = view.contentDOM.getBoundingClientRect();
  const gutterOffset = contentRect.left - view.scrollDOM.getBoundingClientRect().left;
  const markers: RectangleMarker[] = [];
  for (const block of getBlocks(view.state)) {
    // Clamp to the rendered viewport.
    const from = Math.max(block.from, view.viewport.from);
    const to = Math.min(block.to, view.viewport.to);
    if (from > to) {
      continue;
    }

    const firstLine = view.lineBlockAt(from);
    const lastLine = view.lineBlockAt(to);
    markers.push(
      new RectangleMarker(
        className,
        gutterOffset - BOX_INSET_X,
        firstLine.top - BOX_PADDING,
        contentRect.width + BOX_INSET_X,
        lastLine.bottom - firstLine.top + BOX_PADDING * 2,
      ),
    );
  }

  return markers;
};

const outlineTheme = EditorView.theme({
  // The layer sits below the text (`above: false`); keep it out of the way of pointer/selection.
  '.cm-blockLayer': {
    pointerEvents: 'none',
  },
  '.cm-block': {
    boxSizing: 'border-box',
    borderRadius: '4px',
    border: '1px solid var(--dx-block-border, color-mix(in srgb, currentColor 12%, transparent))',
    backgroundColor: 'var(--dx-block-surface, color-mix(in srgb, currentColor 4%, transparent))',
  },
});

/**
 * Renders each block as a non-interactive box behind the text. The document stays fully editable (no
 * text is replaced with widgets); the boxes are drawn in a below-text layer and re-measured on edits,
 * scrolling, and viewport changes. The blocks are supplied by the caller (see `blocks` for markdown
 * top-level blocks).
 */
export const createBlockOutline = ({ getBlocks, className = DEFAULT_CLASS }: BlockOutlineOptions): Extension => [
  outlineTheme,
  layer({
    above: false,
    class: 'cm-blockLayer',
    update: (update) => update.docChanged || update.viewportChanged || update.geometryChanged,
    markers: (view) => buildMarkers(view, getBlocks, className),
  }),
];
