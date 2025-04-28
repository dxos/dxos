//
// Copyright 2025 DXOS.org
//

import { type Extension, Line, RangeSetBuilder, StateEffect, StateField, Text } from '@codemirror/state';
import { EditorView, GutterMarker, gutter } from '@codemirror/view';

// TODO(burdon): Autoscroll.
// TODO(burdon): Fade.
// TODO(burdon): Menu actions.
// TODO(burdon): Edit/corrections.

/**
 * Data structure that maps Blocks queue to lines with transcript state.
 */
// TODO(burdon): Wrap queue.
export class TranscriptModel extends Text {
  constructor(readonly _lines: string[] = ['']) {
    super();
  }

  addLine(line: string) {
    this._lines.push(line);
  }

  //
  // Text abstract class.
  //

  override get children() {
    return null;
  }

  override get length() {
    return this._lines.reduce((acc, line) => acc + line.length + 1, -1); // +1 for '\n', -1 to remove last
  }

  override get lines() {
    return this._lines.length;
  }

  override sliceString(from: number, to?: number, lineSep: string = '\n'): string {
    return this.toString().slice(from, to);
  }

  override toString(lineSep: string = '\n'): string {
    return this._lines.join(lineSep);
  }

  override lineAt(pos: number): Line {
    let offset = 0;
    for (let i = 0; i < this._lines.length; i++) {
      const lineLength = this._lines[i].length + 1; // +1 for '\n'
      if (pos < offset + lineLength) {
        return new Line(offset, offset + this._lines[i].length, i + 1, this._lines[i]);
      }
      offset += lineLength;
    }

    // Fallback to last line.
    const last = this._lines.length - 1;
    return {
      from: offset,
      to: offset + this._lines[last].length,
      number: last + 1,
      text: this._lines[last],
    };
  }

  // override replace(from: number, to: number, text: Text): Text {
  //   const before = this.sliceString(0, from);
  //   const after = this.sliceString(to);
  //   const newText = before + text.toString() + after;
  //   return new TranscriptModel(newText.split('\n'));
  // }

  // override append(other: Text): Text {
  //   return new TranscriptModel((this.toString() + other.toString()).split('\n'));
  // }
}

export type TranscriptOptions = {
  model: TranscriptModel;
};

export const transcript = (options: TranscriptOptions): Extension => {
  return [
    timestampField,
    gutter({
      class: 'cm-timestamp-gutter',
      lineMarkerChange: (update) => update.docChanged || update.viewportChanged,
      markers: (view) => {
        const builder = new RangeSetBuilder<GutterMarker>();
        const timestamps = view.state.field(timestampField);
        for (const { from, to } of view.visibleRanges) {
          let line = view.state.doc.lineAt(from);
          while (line.from <= to) {
            const timestamp = timestamps.get(line.number);
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
    EditorView.theme({
      '.cm-timestamp-gutter': {
        width: '6rem',
        paddingRight: '1rem',
      },
      '.cm-timestamp-gutter .cm-gutterElement': {
        paddingTop: '2.5px',
        textAlign: 'right',
      },
    }),
  ];
};

const setTimestampEffect = StateEffect.define<{ line: number; timestamp: Date }>();

const setLineTimestamp = (meta: { line: number; timestamp: Date }) => setTimestampEffect.of(meta);

/**
 * State tracks timestamps for each line.
 */
const timestampField = StateField.define<Map<number, Date>>({
  create: () => new Map(),
  update: (timestamps, tr) => {
    const updated = new Map(timestamps);
    for (const effect of tr.effects) {
      if (effect.is(setTimestampEffect)) {
        updated.set(effect.value.line, effect.value.timestamp);
      }
    }

    return updated;
  },
});

class TimestampMarker extends GutterMarker {
  constructor(readonly _timestamp: Date) {
    super();
  }

  override toDOM(view: EditorView): HTMLElement {
    const el = document.createElement('div');
    const pad = (n: number) => n.toString().padStart(2, '0');
    el.textContent = [
      pad(this._timestamp.getHours()),
      pad(this._timestamp.getMinutes()),
      pad(this._timestamp.getSeconds()),
    ].join(':');
    return el;
  }
}
