//
// Copyright 2025 DXOS.org
//

import { type Extension, RangeSetBuilder, Text } from '@codemirror/state';
import { EditorView, GutterMarker, ViewPlugin, gutter } from '@codemirror/view';

import { Event, type CleanupFn, addEventListener, combine } from '@dxos/async';

import { type TranscriptBlock } from '../../types';

// TODO(burdon): Autoscroll.
// TODO(burdon): Menu actions.
// TODO(burdon): Edit/corrections.
// TODO(burdon): Fade.

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
// TODO(burdon): Wrap queue.
export type TranscriptOptions = {
  model: TranscriptModel;
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

        constructor(view: EditorView) {
          this._cleanup = combine(
            addEventListener(view.scrollDOM, 'scroll', () => {
              console.log('scroll');
            }),
            options.model.update.on((lines) => {
              const length = view.state.doc.length;
              const text = '\n' + lines.join('\n');

              const scroller = view.scrollDOM;
              const dy = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
              console.log('scroller', scroller.scrollHeight, scroller.scrollTop, scroller.clientHeight, dy);
              const autoScroll = dy === 0;

              // Append to document.
              view.dispatch({
                changes: { from: length, to: length, insert: text },
              });

              if (autoScroll) {
                // Temporarily hide scrollbar to prevent flicker.
                scroller.classList.add('cm-hide-scrollbar');
                setTimeout(() => {
                  scroller.classList.remove('cm-hide-scrollbar');
                }, 1_000);
                view.dispatch({
                  effects: EditorView.scrollIntoView(length + text.length, {
                    y: 'end',
                  }),
                });
              }
            }),
          );
        }

        destroy() {
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
