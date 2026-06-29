//
// Copyright 2025 DXOS.org
//

import { EditorSelection, type Extension, Prec, RangeSetBuilder } from '@codemirror/state';
import {
  type Command,
  Decoration,
  type DecorationSet,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
  keymap,
} from '@codemirror/view';

import { type CompoetionContext } from './match';
import { PlaceholderWidget } from './placeholder';

// TODO(burdon): Option to complete only at end of line.
export type TypeaheadOptions = {
  onComplete?: (context: CompoetionContext) => string | undefined;
};

/**
 * Shows a completion placeholder.
 */
export const typeahead = ({ onComplete }: TypeaheadOptions = {}): Extension => {
  let hint: string | undefined;

  const complete: Command = (view: EditorView) => {
    if (!hint) {
      return false;
    }

    const selection = view.state.selection.main;
    view.dispatch({
      changes: [{ from: selection.from, to: selection.to, insert: hint }],
      selection: EditorSelection.cursor(selection.from + hint.length),
    });

    return true;
  };

  return [
    ViewPlugin.fromClass(
      class {
        decorations: DecorationSet = Decoration.none;
        update(update: ViewUpdate) {
          const builder = new RangeSetBuilder<Decoration>();
          const selection = update.view.state.selection.main;
          const line = update.view.state.doc.lineAt(selection.from);

          // TODO(burdon): Check at end of line and matches start of previous word.
          // TODO(burdon): Context grammar.
          if (selection.from === selection.to && selection.from === line.to) {
            const str = update.state.sliceDoc(line.from, selection.from);
            hint = onComplete?.({ line: str });
            if (hint) {
              builder.add(selection.from, selection.to, Decoration.widget({ widget: new PlaceholderWidget(hint) }));
            }
          }

          this.decorations = builder.finish();
        }
      },
      {
        decorations: (v) => v.decorations,
      },
    ),

    // Keys.
    Prec.highest(
      keymap.of([
        {
          key: 'Tab',
          preventDefault: true,
          run: complete,
        },
        {
          key: 'ArrowRight',
          preventDefault: true,
          run: complete,
        },
      ]),
    ),
  ];
};
