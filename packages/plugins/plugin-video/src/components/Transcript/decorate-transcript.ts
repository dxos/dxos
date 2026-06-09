//
// Copyright 2026 DXOS.org
//

import { type Extension, type Range, RangeSetBuilder } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  GutterMarker,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
  gutter,
} from '@codemirror/view';

import { Domino } from '@dxos/ui';

// TODO(burdon): Reconcile with plugin-transcription.

export type DecorateTranscriptOptions = {
  /** Invoked with the seconds offset when a timestamp widget is activated. */
  onSeek?: (seconds: number) => void;
};

/**
 * Markdown parser config that pairs with {@link decorateTranscript}: removes blockquote parsing so
 * transcript speaker lines beginning with `>>` are NOT parsed as (nested) blockquotes and styled as
 * quotes by `decorateMarkdown`. With it removed, `>>` is plain text that {@link decorateTranscript}
 * hides and restyles. Pass to `createMarkdownExtensions({ extensions: transcriptMarkdownExtensions })`.
 */
export const transcriptMarkdownExtensions = [{ remove: ['Blockquote'] }];

/**
 * Decorates a transcript markdown document:
 * - Markdown links whose text or target encodes a timestamp (e.g. `[1:02](…&t=62)`) are hidden inline
 *   and rendered in a left gutter as a clickable chip that calls `onSeek(seconds)` to move the video.
 * - Paragraphs that start with `>>` are styled as speaker switches (the `>>` marker is replaced with a
 *   speaker widget).
 */
export const decorateTranscript = ({ onSeek }: DecorateTranscriptOptions = {}): Extension => [
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = buildDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildDecorations(update.view);
        }
      }
    },
    {
      decorations: (instance) => instance.decorations,
    },
  ),
  timestampGutter(onSeek),
  gutterTheme,
];

//
// Decorations: hide inline timestamp links + style speaker lines.
//

// `>>` at line start or after whitespace — the inline timestamp link may precede it on the line.
const SPEAKER_RE = /(^|\s)(>>)(\s?)/;
const LINK_RE = /\[([^\]]*)\]\(([^)]*)\)/g;

const buildDecorations = (view: EditorView): DecorationSet => {
  const decorations: Range<Decoration>[] = [];
  const { doc } = view.state;
  for (const { from, to } of view.visibleRanges) {
    let pos = from;
    while (pos <= to && pos <= doc.length) {
      const line = doc.lineAt(pos);

      // Speaker switch: replace the `>>` marker (after any inline timestamp) with a speaker widget.
      const speaker = SPEAKER_RE.exec(line.text);
      if (speaker) {
        const markerStart = speaker.index + speaker[1].length;
        decorations.push(
          Decoration.replace({ widget: new SpeakerWidget() }).range(
            line.from + markerStart,
            line.from + speaker.index + speaker[0].length,
          ),
        );
      }

      // Hide the inline timestamp link (rendered in the gutter instead).
      const timestamp = parseLineTimestamp(line.text);
      if (timestamp) {
        const end = line.text[timestamp.end] === ' ' ? timestamp.end + 1 : timestamp.end;
        decorations.push(Decoration.replace({}).range(line.from + timestamp.start, line.from + end));
      }

      pos = line.to + 1;
    }
  }

  return Decoration.set(decorations, true);
};

//
// Gutter: position the timestamp to the left of each transcript line.
//

const timestampGutter = (onSeek?: (seconds: number) => void): Extension =>
  gutter({
    class: 'cm-timestamp-gutter',
    lineMarkerChange: (update) => update.docChanged || update.viewportChanged,
    markers: (view) => {
      const builder = new RangeSetBuilder<GutterMarker>();
      const { doc } = view.state;
      for (const { from, to } of view.visibleRanges) {
        let pos = from;
        while (pos <= to && pos <= doc.length) {
          const line = doc.lineAt(pos);
          const timestamp = parseLineTimestamp(line.text);
          if (timestamp) {
            builder.add(line.from, line.from, new TimestampMarker(timestamp.label, timestamp.seconds, onSeek));
          }
          pos = line.to + 1;
        }
      }
      return builder.finish();
    },
  });

const gutterTheme = EditorView.theme({
  '.cm-timestamp-gutter': {
    minWidth: '3.5rem',
  },
  // Each transcript segment is a single line; pad it to create gaps between segments.
  '.cm-line': {
    paddingBlock: '0.375rem',
  },
  // Match the line padding so the gutter timestamp stays aligned with its segment.
  '.cm-timestamp-gutter .cm-gutterElement': {
    paddingBlock: '0.375rem',
  },
});

/** Gutter marker shown in place of a timestamp link. */
class TimestampMarker extends GutterMarker {
  constructor(
    private readonly _label: string,
    private readonly _seconds: number,
    private readonly _onSeek?: (seconds: number) => void,
  ) {
    super();
  }

  override eq(other: TimestampMarker): boolean {
    return other._label === this._label && other._seconds === this._seconds && other._onSeek === this._onSeek;
  }

  override toDOM(): HTMLDivElement {
    // Full-width outer element so the marker fills the gutter cell and can position its chip.
    const root = document.createElement('div');
    root.className = 'flex w-full justify-end';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'dx-tag dx-tag--neutral cursor-pointer tabular-nums';
    button.textContent = this._label;
    button.setAttribute('data-seconds', String(this._seconds));
    // Activate on click; prevent the editor from stealing focus/selection.
    button.addEventListener('mousedown', (event) => event.preventDefault());
    button.addEventListener('click', (event) => {
      event.preventDefault();
      this._onSeek?.(this._seconds);
    });

    root.appendChild(button);
    return root;
  }
}

/** Inline widget shown in place of the `>>` speaker-switch marker. */
class SpeakerWidget extends WidgetType {
  override eq(): boolean {
    return true;
  }

  override toDOM(): HTMLElement {
    return Domino.of('span')
      .classNames('dx-tag dx-tag--green inline-flex -ml-0.25 mr-1.5')
      .append(Domino.svg('ph--caret-double-right--regular')).root;
  }
}

//
// Timestamp parsing.
//

/** Finds the first markdown link in a line whose text or target is a timestamp. */
const parseLineTimestamp = (
  text: string,
): { start: number; end: number; seconds: number; label: string } | undefined => {
  LINK_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = LINK_RE.exec(text))) {
    const seconds = parseTimestamp(match[1]) ?? parseUrlTimestamp(match[2]);
    if (seconds !== undefined) {
      return {
        start: match.index,
        end: match.index + match[0].length,
        seconds,
        label: match[1].trim() || formatTimestamp(seconds),
      };
    }
  }

  return undefined;
};

/** Parse `[h:]mm:ss` / `m:ss` link text into seconds. */
export const parseTimestamp = (text: string): number | undefined => {
  const match = /^(?:(\d+):)?(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!match) {
    return undefined;
  }
  const hours = match[1] ? Number(match[1]) : 0;
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  if (minutes >= 60 || seconds >= 60) {
    return undefined;
  }

  return hours * 3600 + minutes * 60 + seconds;
};

/** Parse a `t=` offset from a URL (`t=62`, `t=62s`, `t=1m2s`, `#t=…`). */
export const parseUrlTimestamp = (url: string): number | undefined => {
  const match = /[?&#]t=([0-9hms]+)/.exec(url);
  if (!match) {
    return undefined;
  }
  const value = match[1];
  if (/^\d+s?$/.test(value)) {
    return Number(value.replace(/s$/, ''));
  }
  const parts = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value);
  if (!parts || (!parts[1] && !parts[2] && !parts[3])) {
    return undefined;
  }

  return Number(parts[1] ?? 0) * 3600 + Number(parts[2] ?? 0) * 60 + Number(parts[3] ?? 0);
};

const formatTimestamp = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes);
  return `${hours > 0 ? `${hours}:` : ''}${mm}:${String(secs).padStart(2, '0')}`;
};
