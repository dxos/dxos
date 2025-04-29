//
// Copyright 2025 DXOS.org
//

import { type Extension, RangeSetBuilder, StateEffect, StateField, Text } from '@codemirror/state';
import { EditorView, GutterMarker, ViewPlugin, gutter } from '@codemirror/view';

import { Event, type CleanupFn, addEventListener, combine } from '@dxos/async';
import { type RenderCallback } from '@dxos/react-ui-editor';

import { type TranscriptBlock } from '../../types';

// TODO(burdon): Menu actions.
// TODO(burdon): Edit/corrections.
// TODO(burdon): Fade.

const blockToLines = (block: TranscriptBlock): string[] => {
  return [`###### ${block.authorName}`, ...block.segments.map((segment) => segment.text), ''];
};

// TODO(burdon): Wrap queue.
export class TranscriptModel {
  /** Ordered array of blocks. */
  private readonly _blocks: TranscriptBlock[] = [];

  /** Map of blocks indexed by id. */
  private readonly _blockMap = new Map<string, TranscriptBlock>();

  public readonly update = new Event<{ block: string; lines: string[] }>();

  constructor(blocks: TranscriptBlock[]) {
    blocks.forEach((block) => {
      this.updateBlock(block);
    });
  }

  toJSON() {
    return {
      blocks: this._blocks.length,
    };
  }

  get doc() {
    return Text.of(this._blocks.flatMap(blockToLines));
  }

  getTimestamp(id: string): Date | undefined {
    return this._blockMap.get(id)?.segments[0]?.started;
  }

  reset() {
    // this._lines.clear();
    this._blockMap.clear();
    this._blocks.length = 0;
    return this;
  }

  updateBlock(block: TranscriptBlock, flush = false) {
    if (this._blockMap.has(block.id)) {
      // Replace existing block.
      const idx = this._blocks.findIndex((b) => b.id === block.id);
      if (idx !== -1) {
        this._blocks[idx] = block;
      }
    } else {
      this._blocks.push(block);
    }

    this._blockMap.set(block.id, block);

    if (flush) {
      this.update.emit({ block: block.id, lines: blockToLines(block) });
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
    // State field to map lines to blocks.
    blockStateField,

    // Show timestamps in the gutter.
    gutter({
      class: 'cm-timestamp-gutter',
      lineMarkerChange: (update) => update.docChanged || update.viewportChanged,
      markers: (view) => {
        const builder = new RangeSetBuilder<GutterMarker>();
        const blockMap = view.state.field(blockStateField);
        for (const { from, to } of view.visibleRanges) {
          let line = view.state.doc.lineAt(from);
          while (line.from <= to) {
            const blockId = blockMap.get(line.number);
            if (blockId) {
              const timestamp = options.model.getTimestamp(blockId);
              if (timestamp) {
                builder.add(line.from, line.from, new TimestampMarker(timestamp));
              }
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
        // Block positions.
        private readonly _blocks = new Map<string, { from: number; to: number }>();
        private readonly _cleanup: CleanupFn;
        private readonly _controls?: HTMLDivElement;

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
            // Check if scrolled.
            addEventListener(view.scrollDOM, 'scroll', (ev) => {
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
              const text = '\n' + lines.join('\n');
              const { from, to } = this._blocks.get(block) ?? {
                from: view.state.doc.length,
                to: view.state.doc.length,
              };

              // Get current line number.
              const line = view.state.doc.lineAt(from).number;

              // Append/insert into document and update state field with line number for block.
              this._blocks.set(block, { from, to: from + text.length });
              view.dispatch({
                changes: { from, to, insert: text },
                effects: updateBlockEffect.of({ line, blockId: block }),
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

/**
 * Maintains a map of line numbers to block IDs.
 */
const blockStateField = StateField.define<Map<number, string>>({
  create: () => new Map(),
  update: (map, tr) => {
    const newMap = new Map(map);
    for (const effect of tr.effects) {
      if (effect.is(updateBlockEffect)) {
        const { line, blockId } = effect.value;
        newMap.set(line, blockId);
      }
    }
    return newMap;
  },
});

const updateBlockEffect = StateEffect.define<{ line: number; blockId: string }>();

/**
 * Gutter marker that displays a timestamp.
 */
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
