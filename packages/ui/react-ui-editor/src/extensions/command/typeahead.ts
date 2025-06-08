//
// Copyright 2025 DXOS.org
//

import { EditorSelection, Prec, RangeSetBuilder, type Extension } from '@codemirror/state';
import {
  type Command,
  Decoration,
  type DecorationSet,
  type EditorView,
  keymap,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view';

import { Hint } from './hint';

export type TypeaheadContext = { line: string };

// TODO(burdon): Option to complete only at end of line?
export type TypeaheadOptions = {
  onComplete?: (context: TypeaheadContext) => string | undefined;
};

/**
 * CodeMirror extension for typeahead completion.
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
              builder.add(selection.from, selection.to, Decoration.widget({ widget: new Hint(hint) }));
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

/**
 * Util to match current line to a static list of completions.
 */
export const staticCompletion =
  (completions: string[], defaultCompletion?: string) =>
  ({ line }: TypeaheadContext) => {
    if (line.length === 0 && defaultCompletion) {
      return defaultCompletion;
    }

    const words = line.split(/\s+/).filter(Boolean);
    if (words.length) {
      const word = words.at(-1)!;
      for (const completion of completions) {
        const match = matchCompletion(completion, word);
        if (match) {
          return match;
        }
      }
    }
  };

export const matchCompletion = (completion: string, word: string): string | undefined => {
  if (completion.length > word.length && completion.startsWith(word)) {
    return completion.slice(word.length);
  }
};
