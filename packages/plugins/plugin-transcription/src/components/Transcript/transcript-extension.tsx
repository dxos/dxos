//
// Copyright 2025 DXOS.org
//

import { type Extension, RangeSetBuilder, Text } from '@codemirror/state';
import { EditorView, GutterMarker, ViewPlugin, gutter } from '@codemirror/view';

import { Event, type CleanupFn, addEventListener, combine } from '@dxos/async';
import { type RenderCallback } from '@dxos/react-ui-editor';

import { type TranscriptBlock } from '../../types';

const blockToMarkdown = (block: TranscriptBlock): string[] => {
  // TODO(burdon): Use link/reference markup for users (with popover).
  return [`###### ${block.authorName}`, block.segments.map((segment) => segment.text).join(''), ''];
};

// TODO(burdon): Wrap queue.
export class TranscriptModel {
  /** Ordered array of blocks. */
  private readonly _blocks: TranscriptBlock[] = [];

  /** Map of blocks indexed by id. */
  private readonly _blockMap = new Map<string, TranscriptBlock>();

  /** Map of block ids to line numbers. */
  private readonly _blockLine = new Map<number, TranscriptBlock>();

  /** Current line number. */
  private _line = 1;

  public readonly update = new Event<{ block: string; lines: string[] }>();

  constructor(blocks: TranscriptBlock[]) {
    blocks.forEach((block) => {
      this.setBlock(block);
    });
  }

  toJSON() {
    return {
      line: this._line,
      blocks: this._blocks.length,
    };
  }

  get doc() {
    return Text.of([...this._blocks.flatMap(blockToMarkdown), '']);
  }

  getTimestamp(line: number): Date | undefined {
    const block = this._blockLine.get(line);
    return block?.segments[0]?.started;
  }

  reset() {
    this._blockMap.clear();
    this._blocks.length = 0;
    return this;
  }

  // TODO(burdon): Doesn't support out-of-order blocks or deleting blocks.
  setBlock(block: TranscriptBlock, flush = false) {
    if (this._blockMap.has(block.id)) {
      // Replace existing block.
      const idx = this._blocks.findIndex((b) => b.id === block.id);
      if (idx !== -1) {
        this._blocks[idx] = block;
      }
    } else {
      this._blocks.push(block);
    }

    const lines = blockToMarkdown(block);

    this._blockMap.set(block.id, block);
    this._blockLine.set(this._line, block);
    this._line += lines.length;

    if (flush) {
      this.update.emit({ block: block.id, lines });
    }

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
            const timestamp = options.model.getTimestamp(line.number);
            if (timestamp) {
              builder.add(line.from, line.from, new TimestampMarker(line.number, timestamp));
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
        /** Map of block ranges by id. */
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
            options.model.update.on(({ block, lines }) => {
              // Check if clamped to bottom.
              const autoScroll =
                scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight === 0 || !hasScrolled;

              // Check if block was already inserted.
              const { from, to } = this._blockRange.get(block) ?? {
                from: view.state.doc.length,
                to: view.state.doc.length,
              };

              // Append/insert into document and update state field with line number for block.
              const text = lines.join('\n') + '\n';
              this._blockRange.set(block, { from, to: from + text.length });
              view.dispatch({
                changes: { from, to, insert: text },
              });

              // Scroll.
              if (autoScroll) {
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
      pad(this._timestamp.getHours()),
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
