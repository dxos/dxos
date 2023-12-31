//
// Copyright 2023 DXOS.org
//

import { type Range } from '@codemirror/state';
import { ViewPlugin, type DecorationSet, EditorView, type ViewUpdate, Decoration } from '@codemirror/view';
import get from 'lodash.get';

import { tokens } from '../../../styles';

const CODE_REGEX = /```[\s\S]*?```/gs;

// TODO(burdon): Reconcile with theme.
const styles = EditorView.baseTheme({
  '& .cm-code-block': {
    display: 'block',
    background: get(tokens, 'extend.colors.neutral.50'),
    // margin: '-2px -2px',
    // padding: '2px 2px',
  },
});

export const code = () => {
  const getDecorations = (view: EditorView) => {
    const decorations: Range<Decoration>[] = [];
    if (view.state.readOnly) {
      const text = view.state.doc.sliceString(0);
      const codeBlockMatches = text.matchAll(CODE_REGEX);
      for (const match of codeBlockMatches) {
        const from = match.index!;
        const to = from + match[0].length;
        // TODO(burdon): Doesn't decorate blank lines.
        decorations.push(Decoration.mark({ class: 'cm-code-block' }).range(from, to));
      }
    }

    return Decoration.set(decorations.sort((range1, range2) => range1.from - range2.from));
  };

  return [
    ViewPlugin.fromClass(
      class {
        decorations: DecorationSet;
        constructor(view: EditorView) {
          this.decorations = getDecorations(view);
        }

        update(update: ViewUpdate) {
          if (update.docChanged || update.viewportChanged) {
            this.decorations = getDecorations(update.view);
          }
        }
      },
      {
        decorations: (value) => value.decorations,
      },
    ),
    styles,
  ];
};
