//
// Copyright 2025 DXOS.org
//

import { type Extension, RangeSetBuilder } from '@codemirror/state';
import { EditorView, GutterMarker, ViewPlugin, type ViewUpdate, gutter } from '@codemirror/view';
import { format } from 'date-fns/format';
import { intervalToDuration } from 'date-fns/intervalToDuration';

import { type CleanupFn, addEventListener, combine } from '@dxos/async';
import { type DataType } from '@dxos/schema';

import { DocumentAdapter, type SerializationModel } from '../../model';

/**
 * Data structure that maps Chunks queue to lines with transcript state.
 */
export type TranscriptOptions = {
  model: SerializationModel<DataType.Message>;
  started?: Date;
};

/**
 * Scrolling transcript with timestamps.
 */
export const transcript = ({ model, started }: TranscriptOptions): Extension => [
  // Show timestamps in the gutter.
  gutter({
    class: 'cm-timestamp-gutter',
    lineMarkerChange: (update) => update.docChanged || update.viewportChanged,
    markers: (view) => {
      const start = getStartTime(started, model.chunks[0]);
      const builder = new RangeSetBuilder<GutterMarker>();
      for (const { from, to } of view.visibleRanges) {
        let line = view.state.doc.lineAt(from);
        while (line.from <= to) {
          const block = model.getChunkAtLine(line.number)?.blocks[0];
          const timestamp = block?._tag === 'transcript' && block.started;
          if (timestamp) {
            builder.add(line.from, line.from, new TimestampMarker(line.number, new Date(timestamp), start));
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
      private readonly _controls?: HTMLDivElement;
      private readonly _cleanup: CleanupFn;
      private readonly _adapter: DocumentAdapter;
      private _initialized = false;

      constructor(view: EditorView) {
        this._adapter = new DocumentAdapter(view);

        const scroller = view.scrollDOM;
        let isAutoScrolling = false;
        let hasScrolled = false;

        let timeout: NodeJS.Timeout | undefined;
        const scrollToBottom = (smooth = false) => {
          scroller.style.scrollBehavior = smooth ? 'smooth' : '';

          // Temporarily hide scrollbar to prevent flicker.
          scroller.classList.add('cm-hide-scrollbar');
          isAutoScrolling = true;
          clearTimeout(timeout);
          timeout = setTimeout(() => {
            this._controls?.classList.add('opacity-0');
            scroller.classList.remove('cm-hide-scrollbar');
            isAutoScrolling = false;
          }, 500);

          // Scroll to bottom.
          view.dispatch({
            effects: EditorView.scrollIntoView(view.state.doc.length, { y: 'end' }),
          });
        };

        // Event listeners.
        this._cleanup = combine(
          addEventListener(view.scrollDOM, 'scroll', () => {
            if (!isAutoScrolling) {
              hasScrolled = true;
              this._controls?.classList.remove('opacity-0');
            }
          }),

          model.update.on(() => {
            // Check if clamped to bottom.
            const autoScroll = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight === 0 || !hasScrolled;

            // Sync.
            model.sync(this._adapter);

            // Scroll.
            if (autoScroll) {
              scrollToBottom(true);
            }
          }),
        );
      }

      update(_update: ViewUpdate) {
        // Initial sync.
        if (!this._initialized) {
          this._initialized = true;
          setTimeout(() => {
            model.sync(this._adapter);
          });
        }
      }

      destroy() {
        this._controls?.remove();
        this._cleanup();
      }
    },
  ),

  EditorView.theme({
    '.cm-gutters': {
      backgroundColor: 'var(--dx-baseSurface)',
    },
    '.cm-timestamp-gutter': {
      width: '6rem',
      paddingLeft: '0.5rem',
      paddingRight: '1rem',
    },
    '.cm-timestamp-gutter > .cm-gutterElement > div': {
      display: 'inline-flex',
      textAlign: 'right',
      padding: '3px',
    },
  }),
];

/**
 * Gutter marker that displays a timestamp.
 */
class TimestampMarker extends GutterMarker {
  constructor(
    readonly _line: number,
    readonly _timestamp: Date,
    readonly _started?: Date,
  ) {
    super();
  }

  override eq(other: this): boolean {
    return other._timestamp === this._timestamp;
  }

  override toDOM(view: EditorView): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'text-sm text-subdued hover:bg-hoverSurface cursor-pointer';
    el.textContent = formatTimestamp(this._timestamp, this._started);
    // TODO(burdon): Click to bookmark or copy hyperlink.
    el.onclick = () => {
      const pos = view.state.doc.line(this._line).from;
      view.dispatch({
        effects: EditorView.scrollIntoView(pos, { y: 'start' }),
      });
    };

    return el;
  }
}

const getStartTime = (started?: Date, message?: DataType.Message): Date | undefined => {
  if (started) {
    return started;
  }

  if (message?.blocks[0]?._tag === 'transcript' && message.blocks[0].started) {
    return new Date(message.blocks[0].started);
  }

  return undefined;
};

const formatTimestamp = (timestamp: Date, relative?: Date) => {
  if (relative) {
    const pad = (n = 0) => String(n).padStart(2, '0');
    const { hours, minutes, seconds } = intervalToDuration({ start: relative, end: timestamp });
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  } else {
    return format(timestamp, 'HH:mm:ss');
  }
};
