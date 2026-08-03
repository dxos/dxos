//
// Copyright 2025 DXOS.org
//

import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

export type SnippetOptions = {
  /**
   * Maximum height of the editor as a CSS length; overflowing content is hidden. Shorter content
   * renders at its natural height, so the snippet grows with the document up to this cap.
   * Container units (`cqi`) resolve against the nearest inline-size container — put
   * `dx-inline-size-container` on the wrapper to cap relative to the card's width.
   */
  maxHeight: string;
  /** Zoom factor applied to the editor (e.g. 0.5 renders at 50%). @default 1 */
  scale?: number;
};

/**
 * CodeMirror extension for rendering a non-scrollable snippet of editor content.
 * Constrains the editor to the given height via CSS `max-height`, wraps long
 * lines (`pre-wrap`), and disables scrolling entirely.
 *
 * NOTE: Uses CSS `zoom` rather than `transform: scale` because `zoom` affects
 * layout, so line wrapping fills the full visual width of the container.
 * `transform: scale` only scales paint output, leaving empty space on the right.
 */
export const snippet = ({ maxHeight, scale = 1 }: SnippetOptions) => {
  return [
    EditorState.readOnly.of(true),
    EditorView.editable.of(false),
    EditorState.transactionFilter.of((tr) => {
      if (tr.selection) {
        return [];
      } // Drop any selection changes.

      return tr;
    }),
    EditorView.theme({
      // Outer editor element: clip to the caller-specified cap, but only once content reaches it.
      '&': {
        maxHeight,
        overflow: 'hidden',
      },
      '.cm-scroller': {
        // Prevent scroll; scale up the inner clip so the final visual height matches `maxHeight`.
        maxHeight: `calc(${maxHeight} / ${scale})`,
        overflow: 'hidden !important',
        padding: '0',
      },
      '.cm-content': {
        // zoom (unlike transform: scale) affects layout, so line-wrapping fills the full visual width of the container.
        zoom: scale,
        margin: '0',
        padding: '0',
      },
    }),
  ];
};
