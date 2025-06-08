//
// Copyright 2025 DXOS.org
//

import { EditorSelection, Prec, RangeSetBuilder, type Extension } from '@codemirror/state';
import { Decoration, type DecorationSet, keymap, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { Hint } from './hint';

export type TypeaheadContext = { line: string; word: string };

export type TypeaheadOptions = {
  onComplete?: (args: TypeaheadContext) => string | undefined;
};

export const typeahead = ({ onComplete }: TypeaheadOptions = {}): Extension => {
  let hint: string | undefined;

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
            const words = str.split(/\W+/);
            if (words.length) {
              hint = onComplete?.({ line: str, word: words.at(-1)! });
              if (hint) {
                builder.add(selection.from, selection.to, Decoration.widget({ widget: new Hint(hint) }));
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
    Prec.highest(
      keymap.of([
        {
          key: 'Tab',
          preventDefault: true,
          run: (view) => {
            if (hint) {
              const selection = view.state.selection.main;
              view.dispatch({
                changes: [{ from: selection.from, to: selection.to, insert: hint }],
                selection: EditorSelection.cursor(selection.from + hint.length),
              });
            }

            return true;
          },
        },
      ]),
    ),
  ];
};

export const matchCompletion =
  (completions: string[], defaultCompletion?: string) =>
  ({ line, word }: TypeaheadContext) => {
    if (line.length === 0 && defaultCompletion) {
      return defaultCompletion;
    }

    if (word.length) {
      for (const completion of completions) {
        if (completion.length > word.length && completion.startsWith(word)) {
          return completion.slice(word.length);
        }
      }
    }
  };
