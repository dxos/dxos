//
// Copyright 2025 DXOS.org
//

<<<<<<< HEAD
import { type Extension, RangeSetBuilder, Text } from '@codemirror/state';
import { EditorView, GutterMarker, ViewPlugin, gutter } from '@codemirror/view';

import { Event, type CleanupFn, addEventListener, combine } from '@dxos/async';
import { type RenderCallback } from '@dxos/react-ui-editor';

import { type TranscriptBlock } from '../../types';

const blockToMarkdown = (block: TranscriptBlock, debug = true): string[] => {
  // TODO(burdon): Use link/reference markup for users (with popover).
=======
import { type Extension, RangeSetBuilder } from '@codemirror/state';
import { EditorView, GutterMarker, ViewPlugin, type ViewUpdate, gutter } from '@codemirror/view';

import { type CleanupFn, addEventListener, combine } from '@dxos/async';
import { type RenderCallback } from '@dxos/react-ui-editor';

import { DocumentAdapter, type BlockModel } from './model';
import { type TranscriptBlock } from '../../types';

export const blockToMarkdown = (block: TranscriptBlock, debug = false): string[] => {
  // TODO(burdon): Use link/reference markup for users (with popover).
  // TODO(burdon): Color and avatar.
>>>>>>> 85b36d18db1a6e80897e80aa383ed71629042093
  return [
    `###### ${block.authorName}` + (debug ? ` (${block.id})` : ''),
    block.segments.map((segment) => segment.text).join(' '),
    '',
  ];
};

<<<<<<< HEAD
// TODO(burdon): Wrap queue.
/**
 * Ideally we would implement a custom virtual Text model for the View, but this currently isn't possible in Codemirror.
 * Instead we use a simple model that maps blocks to lines.
 */
export class TranscriptModel {
  /** Ordered array of blocks. */
  private readonly _blocks: TranscriptBlock[] = [];

  /** Map of blocks indexed by id. */
  private readonly _blockMap = new Map<string, TranscriptBlock>();

  /** Map of block ids to line numbers. */
  private readonly _blockLine = new Map<number, TranscriptBlock>();

  /** Line number of the last block. */
  private _lastBlockLine = 1;

  public readonly update = new Event<{ block: string; lines: string[] }>();

  constructor(blocks: TranscriptBlock[]) {
    blocks.forEach((block) => {
      this.setBlock(block, false);
    });
  }

  toJSON() {
    return {
      blocks: this._blocks.length,
      lines: Array.from(this._blockLine.keys()),
    };
  }

  get doc() {
    return Text.of([...this._blocks.flatMap((block) => blockToMarkdown(block)), '']);
  }

  getTimestamp(line: number): Date | undefined {
    const block = this._blockLine.get(line);
    return block?.segments[0]?.started;
  }

  reset() {
    this._blockMap.clear();
    this._blocks.length = 0;
    this._lastBlockLine = 1;
    return this;
  }

  /**
   * Upsert a block into the model and update the document.
   */
  // TODO(burdon): Adapt to queue to determine new or modified blocks.
  // TODO(burdon): Doesn't support out-of-order blocks or deleting blocks.
  setBlock(block: TranscriptBlock, flush = true) {
    if (this._blockMap.has(block.id)) {
      // Replace existing block.
      const idx = this._blocks.findIndex((b) => b.id === block.id);
      if (idx !== -1) {
        this._blocks[idx] = block;
      }

      this._blockMap.set(block.id, block);
    } else {
      // Add new block.
      let line = this._lastBlockLine;
      const lastBlock = this._blockLine.get(this._lastBlockLine);
      if (lastBlock) {
        line += blockToMarkdown(lastBlock).length;
      }

      this._blockMap.set(block.id, block);
      this._blocks.push(block);
      this._blockLine.set(line, block);
      this._lastBlockLine = line;
    }

    if (flush) {
      this.update.emit({ block: block.id, lines: blockToMarkdown(block) });
    }

    return this;
  }
}

=======
>>>>>>> 85b36d18db1a6e80897e80aa383ed71629042093
/**
 * Data structure that maps Blocks queue to lines with transcript state.
 */
export type TranscriptOptions = {
<<<<<<< HEAD
  model: TranscriptModel;
  renderButton?: RenderCallback<{ onClick: () => void }>;
};

export const transcript = (options: TranscriptOptions): Extension => {
=======
  model: BlockModel<TranscriptBlock>;
  renderButton?: RenderCallback<{ onClick: () => void }>;
};

/**
 * Scrolling transcript with timestamps.
 */
export const transcript = ({ model, renderButton }: TranscriptOptions): Extension => {
>>>>>>> 85b36d18db1a6e80897e80aa383ed71629042093
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
<<<<<<< HEAD
            const timestamp = options.model.getTimestamp(line.number);
=======
            const timestamp = model.getBlockAtLine(line.number)?.segments[0]?.started;
>>>>>>> 85b36d18db1a6e80897e80aa383ed71629042093
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
<<<<<<< HEAD
        /** Map of block ranges by id. */
        // TODO(burdon): Change to track line ranges.
        private readonly _blockRange = new Map<string, { from: number; to: number }>();
        private readonly _controls?: HTMLDivElement;
        private readonly _cleanup: CleanupFn;

        constructor(view: EditorView) {
=======
        private readonly _controls?: HTMLDivElement;
        private readonly _cleanup: CleanupFn;
        private readonly _adapter: DocumentAdapter;
        private _initialized = false;

        constructor(view: EditorView) {
          this._adapter = new DocumentAdapter(view);

>>>>>>> 85b36d18db1a6e80897e80aa383ed71629042093
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
<<<<<<< HEAD
          if (options.renderButton) {
            this._controls = document.createElement('div');
            this._controls.classList.add('cm-controls', 'transition-opacity', 'duration-300', 'opacity-0');
            view.dom.appendChild(this._controls);
            options.renderButton(
=======
          if (renderButton) {
            this._controls = document.createElement('div');
            this._controls.classList.add('cm-controls', 'transition-opacity', 'duration-300', 'opacity-0');
            view.dom.appendChild(this._controls);
            renderButton(
>>>>>>> 85b36d18db1a6e80897e80aa383ed71629042093
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
<<<<<<< HEAD
            // Check if scrolled.
=======
>>>>>>> 85b36d18db1a6e80897e80aa383ed71629042093
            addEventListener(view.scrollDOM, 'scroll', () => {
              if (!isAutoScrolling) {
                hasScrolled = true;
                this._controls?.classList.remove('opacity-0');
              }
            }),

<<<<<<< HEAD
            // Listen for model updates.
            // TODO(burdon): Generalize to support out-of-order blocks (e.g., insert lines).
            options.model.update.on(({ block, lines }) => {
              console.log('INSERT');

=======
            model.update.on(() => {
>>>>>>> 85b36d18db1a6e80897e80aa383ed71629042093
              // Check if clamped to bottom.
              const autoScroll =
                scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight === 0 || !hasScrolled;

<<<<<<< HEAD
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
=======
              // Sync.
              model.sync(this._adapter);
>>>>>>> 85b36d18db1a6e80897e80aa383ed71629042093

              // Scroll.
              if (autoScroll) {
                scrollToBottom();
              }
            }),
          );
        }

<<<<<<< HEAD
=======
        update(update: ViewUpdate) {
          // Initial sync.
          if (!this._initialized) {
            this._initialized = true;
            setTimeout(() => {
              model.sync(this._adapter);
            });
          }
        }

>>>>>>> 85b36d18db1a6e80897e80aa383ed71629042093
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
<<<<<<< HEAD
      this._line,
      ':',
      // pad(this._timestamp.getHours()),
=======
      pad(this._timestamp.getHours()),
>>>>>>> 85b36d18db1a6e80897e80aa383ed71629042093
      pad(this._timestamp.getMinutes()),
      pad(this._timestamp.getSeconds()),
    ].join(':');

<<<<<<< HEAD
    // TODO(burdon): Click to bookmark or get hyperlink.
=======
    // TODO(burdon): Click to bookmark or copy hyperlink.
>>>>>>> 85b36d18db1a6e80897e80aa383ed71629042093
    el.onclick = () => {
      const pos = view.state.doc.line(this._line).from;
      view.dispatch({
        effects: EditorView.scrollIntoView(pos, { y: 'start' }),
      });
    };

    return el;
  }
}
