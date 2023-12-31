//
// Copyright 2023 DXOS.org
//

import { type Range } from '@codemirror/state';
import {
  ViewPlugin,
  type DecorationSet,
  EditorView,
  type ViewUpdate,
  Decoration,
  type BlockInfo,
} from '@codemirror/view';
import get from 'lodash.get';

import { mx } from '@dxos/react-ui-theme';

import { tokens } from '../../../styles';

const CODE_REGEX = /```[\s\S]*?```/gs;

// TODO(burdon): Reconcile with theme.
const styles = EditorView.baseTheme({
  '& .cm-code-block': {
    display: 'block',
    background: get(tokens, 'extend.colors.neutral.50'),
    paddingInline: '4px !important',
  },
  '& .cm-code-block-first': {
    paddingTop: '4px !important',
    borderTopLeftRadius: '4px',
    borderTopRightRadius: '4px',
  },
  '& .cm-code-block-last': {
    paddingBottom: '4px !important',
    borderBottomLeftRadius: '4px',
    borderBottomRightRadius: '4px',
  },
});

const getLineRange = (lines: BlockInfo[], from: number, to: number) => {
  const start = lines.findIndex((line) => line.from >= from);
  const end = lines.findIndex((line) => line.to >= to);
  return [start, end];
};

export const code = () => {
  const getDecorations = (view: EditorView) => {
    const decorations: Range<Decoration>[] = [];
    if (view.state.readOnly) {
      const text = view.state.doc.sliceString(0);
      const matches = text.matchAll(CODE_REGEX);
      const blocks = view.viewportLineBlocks;
      for (const match of matches) {
        const range = getLineRange(blocks, match.index!, match.index! + match[0].length);
        for (let i = range[0]; i <= range[1]; i++) {
          const block = blocks[i];
          decorations.push(
            Decoration.line({
              class: mx(
                'cm-code-block',
                i === range[0] && 'cm-code-block-first',
                i === range[1] && 'cm-code-block-last',
              ),
            }).range(block.from),
          );
        }
      }
    }

    return Decoration.set(decorations);
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
