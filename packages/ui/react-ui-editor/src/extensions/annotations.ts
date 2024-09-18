//
// Copyright 2024 DXOS.org
//

import { type EditorState, type Extension, StateField } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';

import { isNotFalsy } from '@dxos/util';

import { Cursor } from './cursor';

type Annotation = {
  cursor: string;
};

export type AnnotationOptions = {
  match?: RegExp; // TODO(burdon): Update via hook (e.g., for search).
};

const annotationMark = Decoration.mark({ class: 'cm-annotation' });

export const annotations = (options: AnnotationOptions = {}): Extension => {
  // TODO(burdon): Build index of matches and cursors (in background function).
  //  Define annotation action in prompt. E.g., extract company names. Find links, etc.
  //  Show popover card. A16Z chain demo. Identify, extract, research, link. Multi-agent.
  const match = (state: EditorState) => {
    const annotations: Annotation[] = [];
    const text = state.doc.toString();
    if (options.match) {
      const matches = text.matchAll(options.match);
      for (const match of matches) {
        const from = match.index!;
        const to = from + match[0].length;
        const cursor = Cursor.getCursorFromRange(state, { from, to });
        annotations.push({ cursor });
      }
    }

    return annotations;
  };

  const annotationsState = StateField.define<Annotation[]>({
    create: (state) => {
      return match(state);
    },
    update: (value, tr) => {
      if (!tr.changes.empty) {
        return match(tr.state);
      }

      return value;
    },
  });

  return [
    annotationsState,
    EditorView.decorations.compute([annotationsState], (state) => {
      const annotations = state.field(annotationsState);
      const decorations = annotations
        .map((annotation) => {
          const range = Cursor.getRangeFromCursor(state, annotation.cursor);
          return range && annotationMark.range(range.from, range.to);
        })
        .filter(isNotFalsy);

      return Decoration.set(decorations);
    }),
    styles,
  ];
};

const styles = EditorView.theme({
  '.cm-annotation': {
    textDecoration: 'underline',
    textDecorationStyle: 'wavy',
    textDecorationColor: 'var(--dx-error)',
  },
});
