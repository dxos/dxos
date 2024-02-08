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
  '& .cm-codeblock-line': {
    paddingInline: '1rem !important',
  },

  '& .cm-codeblock-end': {
    display: 'inline-block',
    width: '100%',
    position: 'relative',
    '&::after': {
      position: 'absolute',
      inset: 0,
      content: '""',
    },
  },
  '& .cm-codeblock-first': {
    '&::after': {
      borderTopLeftRadius: '.5rem',
      borderTopRightRadius: '.5rem',
    },
  },
  '& .cm-codeblock-last': {
    '&::after': {
      borderBottomLeftRadius: '.5rem',
      borderBottomRightRadius: '.5rem',
    },
  },

  '&light .cm-codeblock-line, &light .cm-activeLine.cm-codeblock-line': {
    background: getToken('extend.semanticColors.input.light'),
    mixBlendMode: 'darken',
  },
  '&dark .cm-codeblock-line, &dark .cm-activeLine.cm-codeblock-line': {
    background: getToken('extend.semanticColors.input.dark'),
    mixBlendMode: 'lighten',
  },
  '&light .cm-codeblock-first, &light .cm-codeblock-last': {
    mixBlendMode: 'darken',
    '&::after': {
      background: getToken('extend.semanticColors.input.light'),
    },
  },
  '&dark .cm-codeblock-first, &dark .cm-codeblock-last': {
    mixBlendMode: 'lighten',
    '&::after': {
      background: getToken('extend.semanticColors.input.dark'),
    },
  },
});

// TODO(burdon): Start from EditorView.lineBlockAt(pos).
const getLineRange = (lines: BlockInfo[], from: number, to: number) => {
  const start = lines.findIndex((line) => line.from >= from);
  const end = lines.findIndex((line) => line.to >= to);
  return [start, end];
};

/**
 * Widget for first/last line of code block (read-only).
 */
// TODO(burdon): Add copy-to-clipboard button.
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

const top = new LineWidget('cm-codeblock-end cm-codeblock-first');
const bottom = new LineWidget('cm-codeblock-end cm-codeblock-last');

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
          const editing = !view.state.readOnly && cursor >= node.from && cursor <= node.to;
          const range = getLineRange(blocks, node.from, node.to);
          for (let i = range[0]; i <= range[1]; i++) {
            const block = blocks[i];
            if (!editing && (i === range[0] || i === range[1])) {
              builder.add(block.from, block.to, Decoration.replace({ widget: i === range[0] ? top : bottom }));
            } else {
              builder.add(
                block.from,
                block.from,
                Decoration.line({
                  class: mx(
                    'cm-code cm-codeblock-line',
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
