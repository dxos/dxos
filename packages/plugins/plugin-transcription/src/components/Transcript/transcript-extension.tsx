//
// Copyright 2025 DXOS.org
//

import { type Extension, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import { EditorView, GutterMarker, gutter } from '@codemirror/view';

// TODO(burdon): Autoscroll + fade.
// TODO(burdon): Data structure that maps Blocks to lines with transcript state.
// TODO(burdon): Extension pulls in blocks by timestamp (as scrolls).
// TOOD(burdon): Client pushes blocks into structure.
// TODO(burdon): Menu actions.
// TODO(burdon): Edit/corrections.

export type TranscriptOptions = {
  getTimestamp: (line: number) => string;
};

export const transcript = (options: TranscriptOptions): Extension => {
  return [
    timestampField,
    gutter({
      class: 'cm-timestamp-gutter',
      initialSpacer: () => new TimestampMarker('--:--'),
      lineMarkerChange: (update) => update.docChanged || update.viewportChanged,
      markers: (view) => {
        const builder = new RangeSetBuilder<GutterMarker>();
        for (const { from, to } of view.visibleRanges) {
          let line = view.state.doc.lineAt(from);
          while (line.from <= to) {
            const timestamp = options.getTimestamp(line.number);
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

const setTimestampEffect = StateEffect.define<{ line: number; timestamp: string }>();

const setLineTimestamp = (meta: { line: number; timestamp: string }) => setTimestampEffect.of(meta);

/**
 * State tracks timestamps for each line.
 */
const timestampField = StateField.define<Map<number, string>>({
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
  constructor(readonly _timestamp: string) {
    super();
  }

  override toDOM(view: EditorView): HTMLElement {
    const el = document.createElement('div');
    el.textContent = this._timestamp;
    return el;
  }
}
