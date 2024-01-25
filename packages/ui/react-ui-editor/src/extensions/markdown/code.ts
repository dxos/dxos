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
// [aria-readonly="true"]
const styles = EditorView.baseTheme({
  '& .cm-code': {
    paddingInline: '1rem !important',
    fontFamily: getToken('fontFamily.mono', []).join(','),
  },
  '& .cm-codeblock': {
    display: 'inline-block',
    width: '100%',
  },
  '&light .cm-codeblock, &light .cm-codeblock.cm-activeLine': {
    background: getToken('extend.colors.neutral.25'),
  },
  '&dark .cm-codeblock, &dark .cm-codeblock.cm-activeLine': {
    background: getToken('extend.colors.neutral.850'),
  },
  '& .cm-codeblock-first': {
    borderTopLeftRadius: '.5rem',
    borderTopRightRadius: '.5rem',
  },
  '& .cm-codeblock-last': {
    borderBottomLeftRadius: '.5rem',
    borderBottomRightRadius: '.5rem',
  },
});

// TODO(burdon): Start from EditorView.lineBlockAt(pos).
const getLineRange = (lines: BlockInfo[], from: number, to: number) => {
  const start = lines.findIndex((line) => line.from >= from);
  const end = lines.findIndex((line) => line.to >= to);
  return [start, end];
};

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

const buildDecorations = (view: EditorView): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  const { state } = view;
  const blocks = view.viewportLineBlocks;
  const cursor = state.selection.main.head;

  // TODO(burdon): Add copy to clipboard widget.
  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      enter: (node) => {
        if (node.name === 'FencedCode') {
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
                  class: mx('cm-code cm-codeblock'),
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
