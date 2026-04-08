//
// Copyright 2025 DXOS.org
//

import { type PluginValue, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

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
  // Internal height is divided by scale so the visible area matches the requested height.
  const internalHeight = Math.round(height / scale);

  const clipPlugin = ViewPlugin.fromClass(
    class SnippetPlugin implements PluginValue {
      private clipHeight = 0;

      update(update: ViewUpdate) {
        update.view.requestMeasure({
          // key deduplicates concurrent requests within the same animation frame.
          key: this,
          read: (view) => {
            const containerHeight = view.dom.clientHeight;
            if (containerHeight === 0) {
              return 0;
            }
            // With CSS zoom, clientHeight can be in visual pixels while line positions use
            // layout pixels (same space as internalHeight / theme maxHeight).
            const clipLimit = scale === 1 ? containerHeight : Math.min(internalHeight, containerHeight / scale);
            // Find the block (line) at the very bottom of the visible area.
            const block = view.lineBlockAtHeight(clipLimit - 1);
            // If the block overflows the container, clip at the block's top edge.
            return block.top + block.height > clipLimit ? block.top : clipLimit;
          },
          write: (clipHeight, view) => {
            if (clipHeight > 0 && clipHeight !== this.clipHeight) {
              this.clipHeight = clipHeight;
              view.dom.style.maxHeight = `${clipHeight}px`;
            }
          },
        });
      }
    },
  );

  return [
    clipPlugin,
    EditorView.theme({
      '&': {
        maxHeight: `${internalHeight}px`,
        overflow: 'hidden',
        ...(scale !== 1 && { zoom: `${scale}` }),
      },
      '.cm-content': {
        whiteSpace: 'pre',
        margin: '0',
        padding: '0',
      },
      '.cm-line': {
        padding: '0',
      },
      '.cm-scroller': {
        overflow: 'hidden !important',
      },
    }),
  ];
};
