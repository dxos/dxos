//
// Copyright 2025 DXOS.org
//

import { EditorView } from '@codemirror/view';

export type SnippetOptions = {
  /** Maximum height of the editor in pixels. Content is clipped to whole lines within this height. */
  height: number;
  /** Zoom factor applied to the editor (e.g. 0.5 renders at 50%). @default 1 */
  scale?: number;
};

/**
 * CodeMirror extension for rendering a non-scrollable snippet of editor content.
 * Constrains the editor to the given height, clips to whole line boundaries,
 * and disables scrolling entirely.
 * Uses requestMeasure to read post-layout heights and lineBlockAtHeight to handle
 * varying line heights from headings and other decorated blocks.
 */
export const snippet = ({ height, scale = 1 }: SnippetOptions) => {
  return [
    EditorView.theme({
      '&': {
        maxHeight: `${height}px`,
        overflow: 'hidden',
        boxSizing: 'border-box',
        ...(scale !== 1 && { zoom: `${scale}` }),
      },
      '.cm-content': {
        whiteSpace: 'pre-wrap',
        margin: '0',
        padding: '0',
      },
      '.cm-line': {
        padding: '0',
      },
      '.cm-scroller': {
        overflow: 'hidden !important',
        padding: '0',
      },
    }),
  ];
};
