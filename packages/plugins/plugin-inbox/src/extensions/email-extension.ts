//
// Copyright 2026 DXOS.org
//

import { type Extension, RangeSetBuilder } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { REPLY_REGEXP } from '../util';

const quotedLineDecoration = Decoration.line({ class: 'text-subdued' });

const buildDecorations = (view: EditorView): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  const { doc } = view.state;
  const match = REPLY_REGEXP.exec(doc.toString());
  if (match) {
    const startLine = doc.lineAt(match.index).number;
    for (let i = startLine; i <= doc.lines; i++) {
      const line = doc.line(i);
      builder.add(line.from, line.from, quotedLineDecoration);
    }
  }

  return builder.finish();
};

/**
 * Parses plaintext email and decorates quoted response lines (below the `---` marker).
 */
export const email = (): Extension => [
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged) {
          this.decorations = buildDecorations(update.view);
        }
      }
    },
    {
      decorations: (v) => v.decorations,
    },
  ),
];
