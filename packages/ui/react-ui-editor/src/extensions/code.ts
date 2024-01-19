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

import { mx } from '@dxos/react-ui-theme';

import { getToken } from '../styles';

const CODE_REGEX = /```[\s\S]*?```/gs;

// TODO(burdon): Reconcile with theme.
const styles = EditorView.baseTheme({
  '& .cm-codeblock': {
    fontFamily: getToken('fontFamily.mono', []).join(','),
  },
  '&light [aria-readonly="true"] .cm-codeblock': {
    background: getToken('extend.colors.neutral.50'),
  },
  '&dark [aria-readonly="true"] .cm-codeblock': {
    background: getToken('extend.colors.neutral.850'),
  },
  '& [aria-readonly="true"] .cm-codeblock': {
    display: 'block',
    paddingInline: '4px !important',
  },
  '& [aria-readonly="true"] .cm-codeblock-first': {
    paddingTop: '4px !important',
    borderTopLeftRadius: '4px',
    borderTopRightRadius: '4px',
  },
  '& [aria-readonly="true"] .cm-codeblock-last': {
    paddingBottom: '4px !important',
    borderBottomLeftRadius: '4px',
    borderBottomRightRadius: '4px',
  },
});

// TODO(burdon): Start from EditorView.lineBlockAt(pos).
const getLineRange = (lines: BlockInfo[], from: number, to: number) => {
  const start = lines.findIndex((line) => line.from >= from);
  const end = lines.findIndex((line) => line.to >= to);
  return [start, end];
};

export const code = () => {
  const buildDecorations = (view: EditorView) => {
    const decorations: Range<Decoration>[] = [];
    const text = view.state.doc.sliceString(0);
    const matches = text.matchAll(CODE_REGEX);
    const blocks = view.viewportLineBlocks;
    for (const match of matches) {
      const range = getLineRange(blocks, match.index!, match.index! + match[0].length);
      for (let i = range[0]; i <= range[1]; i++) {
        const block = blocks[i];
        decorations.push(
          Decoration.line({
            class: mx('cm-codeblock', i === range[0] && 'cm-codeblock-first', i === range[1] && 'cm-codeblock-last'),
          }).range(block.from),
        );
      }
    }

    return Decoration.set(decorations);
  };

  return [
    ViewPlugin.fromClass(
      class {
        hasFocus = false;
        decorations: DecorationSet;
        constructor(view: EditorView) {
          this.decorations = buildDecorations(view);
        }

        update(update: ViewUpdate) {
          if (
            // TODO(burdon): Generalize for other extensions.
            this.hasFocus !== update.view.hasFocus ||
            update.startState.readOnly !== update.view.state.readOnly ||
            update.docChanged ||
            update.viewportChanged
          ) {
            this.hasFocus = update.view.hasFocus;
            this.decorations = buildDecorations(update.view);
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
