//
// Copyright 2024 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type Extension, RangeSetBuilder } from '@codemirror/state';
import {
  type Command,
  Decoration,
  type DecorationSet,
  type EditorView,
  keymap,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view';

export type FormattingOptions = {};

// TODO(burdon): Set heading for line.
export const setHeading =
  (level: number): Command =>
  (view: EditorView) => {
    return true;
  };

export const toggleStyle =
  (mark: string): Command =>
  (view) => {
    const { ranges } = view.state.selection;
    for (const range of ranges) {
      if (range.from === range.to) {
        return false;
      }

      // TODO(burdon): Detect if already bold.
      console.log(JSON.stringify({ range }));
      view.dispatch({
        changes: [
          {
            from: range.from,
            insert: mark,
          },
          {
            from: range.to,
            insert: mark,
          },
        ],
      });
    }

    return true;
  };

export const toggleBold = toggleStyle('**');
export const toggleItalic = toggleStyle('_');
export const toggleStrikethrough = toggleStyle('~~');

export const formatting = (options: FormattingOptions = {}): Extension => {
  return [
    keymap.of([
      {
        key: 'meta-b',
        run: toggleBold,
      },
    ]),
    styling(),
  ];
};

// https://github.github.com/gfm
// https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax

const styling = (): Extension => {
  const buildDecorations = (view: EditorView): DecorationSet => {
    const builder = new RangeSetBuilder<Decoration>();
    const { state } = view;
    const cursor = state.selection.main.head;

    for (const { from, to } of view.visibleRanges) {
      syntaxTree(state).iterate({
        enter: (node) => {
          // console.log(node.name);
          switch (node.name) {
            case 'Emphasis':
            case 'StrongEmphasis': {
              // TODO(burdon): Bug if '***foo***' (since StrongEmphasis is nested inside EmphasisMark).
              //  Ranges must be added sorted by `from` position and `startSide`.
              const marks = node.node.getChildren('EmphasisMark');

              // Check if cursor is inside text.
              if (cursor <= node.from || cursor >= node.to) {
                for (const mark of marks) {
                  builder.add(mark.from, mark.to, Decoration.replace({}));
                }
              }
              break;
            }
          }
        },
        from,
        to,
      });
    }

    return builder.finish();
  };

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
  ];
};
