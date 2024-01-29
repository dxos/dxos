//
// Copyright 2023 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';
import {
  ViewPlugin,
  type DecorationSet,
  EditorView,
  type ViewUpdate,
  Decoration,
  type BlockInfo,
  WidgetType,
} from '@codemirror/view';

import { mx } from '@dxos/react-ui-theme';

import { getToken } from '../../styles';

// TODO(burdon): Reconcile with theme.
const styles = EditorView.baseTheme({
  '& .cm-code': {
    fontFamily: getToken('fontFamily.mono', []).join(','),
  },
  '& .cm-codeblock': {
    width: '100%',
    paddingInline: '1rem !important',
    position: 'relative',
    '&::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
    },
  },
  '&light .cm-codeblock': {
    '&::after': {
      background: getToken('extend.semanticColors.input.light'),
      mixBlendMode: 'darken',
    },
  },
  '&dark .cm-codeblock': {
    '&::after': {
      background: getToken('extend.semanticColors.input.dark'),
      mixBlendMode: 'lighten',
    },
  },
  '& .cm-codeblock-first': {
    display: 'inline-block',
    '&::after': {
      borderTopLeftRadius: '.5rem',
      borderTopRightRadius: '.5rem',
    },
  },
  '& .cm-codeblock-last': {
    display: 'inline-block',
    '&::after': {
      borderBottomLeftRadius: '.5rem',
      borderBottomRightRadius: '.5rem',
    },
  },
});

// TODO(burdon): Start from EditorView.lineBlockAt(pos).
const getLineRange = (lines: BlockInfo[], from: number, to: number) => {
  const start = lines.findIndex((line) => line.from >= from);
  const end = lines.findIndex((line) => line.to >= to);
  return [start, end];
};

// TODO(burdon): Add copy to clipboard widget.
class LineWidget extends WidgetType {
  constructor(private readonly _className: string) {
    super();
  }

  override toDOM() {
    const el = document.createElement('span');
    el.innerHTML = '&nbsp;';
    el.className = mx('cm-code cm-codeblock', this._className);
    return el;
  }
}

const top = new LineWidget('cm-codeblock-first');
const bottom = new LineWidget('cm-codeblock-last');

// TODO(burdon): Selection isn't visible unless multiline (e.g., can't highlight word).

const buildDecorations = (view: EditorView): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  const { state } = view;
  const blocks = view.viewportLineBlocks;
  const cursor = state.selection.main.head;

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      enter: (node) => {
        if (node.name === 'FencedCode') {
          // FencedCode > CodeMark > [CodeInfo] > CodeText > CodeMark
          const edit = !view.state.readOnly && cursor >= node.from && cursor <= node.to;
          const range = getLineRange(blocks, node.from, node.to);
          for (let i = range[0]; i <= range[1]; i++) {
            const block = blocks[i];
            if (!edit && (i === range[0] || i === range[1])) {
              builder.add(block.from, block.to, Decoration.replace({ widget: i === range[0] ? top : bottom }));
            } else {
              builder.add(
                block.from,
                block.from,
                Decoration.line({
                  class: mx(
                    'cm-code cm-codeblock',
                    i === range[0] && 'cm-codeblock-first',
                    i === range[1] && 'cm-codeblock-last',
                  ),
                }),
              );
            }
          }
        }
      },
      from,
      to,
    });
  }

  return builder.finish();
};

export const code = () => {
  return [
    ViewPlugin.fromClass(
      class {
        decorations: DecorationSet;
        constructor(view: EditorView) {
          this.decorations = buildDecorations(view);
        }

        update(update: ViewUpdate) {
          this.decorations = buildDecorations(update.view);
        }
      },
      {
        decorations: (value) => value.decorations,
      },
    ),
    styles,
  ];
};
