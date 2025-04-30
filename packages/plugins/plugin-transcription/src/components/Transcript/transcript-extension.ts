//
// Copyright 2025 DXOS.org
//

import { type Extension, RangeSetBuilder } from '@codemirror/state';
import { EditorView, GutterMarker, ViewPlugin, gutter } from '@codemirror/view';

import { type CleanupFn, addEventListener, combine } from '@dxos/async';
import { type RenderCallback } from '@dxos/react-ui-editor';

import { type BlockModel } from './model';
import { type TranscriptBlock } from '../../types';

export const blockToMarkdown = (block: TranscriptBlock, debug = true): string[] => {
  // TODO(burdon): Use link/reference markup for users (with popover).
  return [
    `###### ${block.authorName}` + (debug ? ` (${block.id})` : ''),
    block.segments.map((segment) => segment.text).join(' '),
    '',
  ];
};

/**
 * Data structure that maps Blocks queue to lines with transcript state.
 */
export type TranscriptOptions = {
  model: BlockModel<TranscriptBlock>;
  renderButton?: RenderCallback<{ onClick: () => void }>;
};

export const transcript = (options: TranscriptOptions): Extension => {
  return [
    // Show timestamps in the gutter.
    gutter({
      class: 'cm-timestamp-gutter',
      lineMarkerChange: (update) => update.docChanged || update.viewportChanged,
      markers: (view) => {
        const builder = new RangeSetBuilder<GutterMarker>();
        for (const { from, to } of view.visibleRanges) {
          let line = view.state.doc.lineAt(from);
          while (line.from <= to) {
            // const timestamp = options.model.getTimestamp(line.number);
            // if (timestamp) {
            //   builder.add(line.from, line.from, new TimestampMarker(line.number, timestamp));
            // }

            if (line.to + 1 > view.state.doc.length) {
              break;
            }

            line = view.state.doc.lineAt(line.to + 1);
          }
        }

        return builder.finish();
      },
    }),

    // Listen for model updates.
    ViewPlugin.fromClass(
      class {
        /** Map of block ranges by id. */
        // TODO(burdon): Change to track line ranges.
        private readonly _blockRange = new Map<string, { from: number; to: number }>();
        private readonly _controls?: HTMLDivElement;
        private readonly _cleanup: CleanupFn;

        constructor(view: EditorView) {
          const scroller = view.scrollDOM;
          let isAutoScrolling = false;
          let hasScrolled = false;

          const scrollToBottom = () => {
            scroller.style.scrollBehavior = 'smooth';

            // Temporarily hide scrollbar to prevent flicker.
            scroller.classList.add('cm-hide-scrollbar');
            isAutoScrolling = true;
            setTimeout(() => {
              this._controls?.classList.add('opacity-0');
              scroller.classList.remove('cm-hide-scrollbar');
              isAutoScrolling = false;
            }, 1_000);

            // Scroll to bottom.
            view.dispatch({
              effects: EditorView.scrollIntoView(view.state.doc.length, { y: 'end' }),
            });
          };

          // Scroll button.
          if (options.renderButton) {
            this._controls = document.createElement('div');
            this._controls.classList.add('cm-controls', 'transition-opacity', 'duration-300', 'opacity-0');
            view.dom.appendChild(this._controls);
            options.renderButton(
              this._controls,
              {
                onClick: () => {
                  scrollToBottom();
                },
              },
              view,
            );
          }

          // Event listeners.
          this._cleanup = combine(
            // Check if scrolled.
            addEventListener(view.scrollDOM, 'scroll', () => {
              if (!isAutoScrolling) {
                hasScrolled = true;
                this._controls?.classList.remove('opacity-0');
              }
            }),

            // Listen for model updates.
            // TODO(burdon): Generalize to support out-of-order blocks (e.g., insert lines).
            // options.model.update.on(({ block, lines }) => {
            // Check if clamped to bottom.
            // const autoScroll =
            // scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight === 0 || !hasScrolled;

            // Scroll.
            // if (autoScroll) {
            //   scrollToBottom();
            // }
            // }),
          );
        }

        destroy() {
          this._controls?.remove();
          this._cleanup();
        }
      },
    ),

    EditorView.theme({
      '.cm-scroller': {
        overflowY: 'scroll',
      },
      '.cm-hide-scrollbar': {
        scrollbarWidth: 'none',
        '-ms-overflow-style': 'none',
      },
      '.cm-hide-scrollbar::-webkit-scrollbar': {
        display: 'none',
      },
      '.cm-controls': {
        position: 'absolute',
        bottom: '0.5rem',
        right: '0.5rem',
        zIndex: 1000,
      },
      '.cm-line': {
        paddingRight: '1rem',
      },
      '.cm-timestamp-gutter': {
        width: '6rem',
        paddingRight: '1rem',
      },
      '.cm-timestamp-gutter > .cm-gutterElement > div': {
        display: 'inline-flex',
        textAlign: 'right',
        padding: '3px',
      },
    }),
  ];
};

/**
 * Gutter marker that displays a timestamp.
 */
class TimestampMarker extends GutterMarker {
  constructor(
    readonly _line: number,
    readonly _timestamp: Date,
  ) {
    super();
  }

  override eq(other: this) {
    return other._timestamp === this._timestamp;
  }

  override toDOM(view: EditorView) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const el = document.createElement('div');
    el.className = 'text-sm text-subdued hover:bg-hoverSurface cursor-pointer';
    el.textContent = [
      this._line,
      ':',
      // pad(this._timestamp.getHours()),
      pad(this._timestamp.getMinutes()),
      pad(this._timestamp.getSeconds()),
    ].join(':');

    // TODO(burdon): Click to bookmark or get hyperlink.
    el.onclick = () => {
      const pos = view.state.doc.line(this._line).from;
      view.dispatch({
        effects: EditorView.scrollIntoView(pos, { y: 'start' }),
      });
    };

    return el;
  }
}
