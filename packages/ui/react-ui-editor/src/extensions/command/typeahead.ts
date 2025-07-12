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

type CompletionOptions = {
  default?: string;
  minLength?: number;
};

/**
 * Util to match current line to a static list of completions.
 */
export const staticCompletion =
  (completions: string[], options: CompletionOptions = {}) =>
  ({ line }: TypeaheadContext) => {
    if (line.length === 0 && options.default) {
      return options.default;
    }

    const parts = line.split(/\s+/).filter(Boolean);
    if (parts.length) {
      const str = parts.at(-1)!;
      if (str.length >= (options.minLength ?? 0)) {
        for (const completion of completions) {
          const match = matchCompletion(completion, str);
          if (match) {
            return match;
          }
        }
      }
    }
  };

export const matchCompletion = (completion: string, str: string, minLength = 0): string | undefined => {
  if (
    str.length >= minLength &&
    completion.length > str.length &&
    completion.startsWith(str)
    // TODO(burdon): If case insensitive, need to replace existing chars.
    // completion.toLowerCase().startsWith(str.toLowerCase())
  ) {
    return completion.slice(str.length);
  }
};
