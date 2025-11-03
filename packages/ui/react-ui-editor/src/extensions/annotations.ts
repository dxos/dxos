//
// Copyright 2024 DXOS.org
//

import { type Extension, RangeSetBuilder } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

const annotationMark = Decoration.mark({ class: 'cm-annotation' });

export type AnnotationOptions = {
  match?: RegExp; // TODO(burdon): Update via hook (e.g., for search).
};

/**
 *
 */
export const annotations = ({ match }: AnnotationOptions = {}): Extension => [
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet = Decoration.none;
      update(update: ViewUpdate) {
        const builder = new RangeSetBuilder<Decoration>();
        if (match) {
          // Only process visible lines.
          const { from, to } = update.view.viewport;
          const text = update.state.doc.sliceString(from, to);
          const matches = text.matchAll(match);
          for (const m of matches) {
            if (m.index !== undefined) {
              // Adjust match position relative to viewport.
              const start = from + m.index;
              const end = start + m[0].length;
              builder.add(start, end, annotationMark);
            }
          }
        }

        this.decorations = builder.finish();
      }
    },
    {
      decorations: (v) => v.decorations,
    },
  ),

  EditorView.theme({
    '.cm-annotation': {
      textDecoration: 'underline',
      textDecorationStyle: 'wavy',
      textDecorationColor: 'var(--dx-errorText)',
    },
  }),
];
