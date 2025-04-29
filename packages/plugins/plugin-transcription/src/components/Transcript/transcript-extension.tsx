//
// Copyright 2025 DXOS.org
//

import { type Extension, RangeSetBuilder, Text } from '@codemirror/state';
import { EditorView, GutterMarker, ViewPlugin, gutter } from '@codemirror/view';

import { Event, type CleanupFn, addEventListener, combine } from '@dxos/async';
import { type RenderCallback } from '@dxos/react-ui-editor';

import { type TranscriptBlock } from '../../types';

// TODO(burdon): Menu actions.
// TODO(burdon): Edit/corrections.
// TODO(burdon): Fade.

// TODO(burdon): Wrap queue.
export class TranscriptModel {
  private readonly _blocks: TranscriptBlock[] = [];
  private readonly _lines: string[] = [];
  private readonly _timestamps: Map<number, Date> = new Map();

  public readonly update = new Event<string[]>();

  constructor(blocks: TranscriptBlock[]) {
    blocks.forEach((block) => {
      this.addBlock(block, true);
    });
  }

  toJSON() {
    return { blocks: this._blocks.length, lines: this._lines.length };
  }

  get doc() {
    return Text.of(this._lines);
  }

  get blocks() {
    return this._blocks;
  }

  get lines() {
    return this._lines.length;
  }

  getTimestamp(line: number): Date | undefined {
    return this._timestamps.get(line);
  }

  reset() {
    this._lines.length = 0;
    this._timestamps.clear();
    this.update.emit([]);
    return this;
  }

  // TOOD(burdon): Replace existing blocks.
  // TODO(burdon): Rebuild document.
  addBlock(block: TranscriptBlock, flush = false) {
    this._blocks.push(block);
    const line = this._lines.length;
    const lines = [`###### ${block.authorName}`, ...block.segments.map((segment) => segment.text), ''];
    if (block.segments.length > 0) {
      this._timestamps.set(line, block.segments[0].started);
    }

    if (flush) {
      this.update.emit(lines);
    }

    this._lines.push(...lines);
    return this;
  }
}

/**
 * Data structure that maps Blocks queue to lines with transcript state.
 */
export type TranscriptOptions = {
  model: TranscriptModel;
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
            const timestamp = options.model.getTimestamp(line.number - 1);
            if (timestamp) {
              builder.add(line.from, line.from, new TimestampMarker(timestamp));
            }
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
        private readonly _cleanup: CleanupFn;
        private _controls?: HTMLDivElement;

        constructor(view: EditorView) {
          const scroller = view.scrollDOM;
          let isAutoScrolling = false;
          let hasScrolled = false;

          const scrollToBottom = () => {
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
              effects: EditorView.scrollIntoView(view.state.doc.length, {
                y: 'end',
              }),
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
            addEventListener(view.scrollDOM, 'scroll', (ev) => {
              if (!isAutoScrolling) {
                hasScrolled = true;
                this._controls?.classList.remove('opacity-0');
              }
            }),
            options.model.update.on((lines) => {
              // Check if clamped to bottom.
              const autoScroll = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight === 0;

              // Append to document.
              const length = view.state.doc.length;
              view.dispatch({
                changes: { from: length, to: length, insert: '\n' + lines.join('\n') },
              });

              if (autoScroll || !hasScrolled) {
                scrollToBottom();
              }
            }),
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
        scrollBehavior: 'smooth',
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
        width: '5rem',
        paddingRight: '1rem',
      },
      '.cm-timestamp-gutter > .cm-gutterElement > div': {
        display: 'inline-flex',
        textAlign: 'right',
        padding: '5px',
      },
    }),
  ];
};

class TimestampMarker extends GutterMarker {
  constructor(readonly _timestamp: Date) {
    super();
  }

  override toDOM(view: EditorView): HTMLElement {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const el = document.createElement('div');
    el.className = 'hover:bg-hoverSurface cursor-pointer';
    el.textContent = [
      pad(this._timestamp.getHours()),
      pad(this._timestamp.getMinutes()),
      pad(this._timestamp.getSeconds()),
    ].join(':');
    return el;
  }
}
