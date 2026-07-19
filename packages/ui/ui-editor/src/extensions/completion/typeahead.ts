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

import { type CompletionContext } from './match';
import { PlaceholderWidget } from './placeholder';

// TODO(burdon): Option to complete only at end of line.
export type TypeaheadOptions = {
  onComplete?: (context: CompletionContext) => string | undefined;
};

/**
 * Shows a completion placeholder.
 */
export const typeahead = ({ onComplete }: TypeaheadOptions = {}): Extension => {
  // Kept per-view (not in the factory closure) so a single extension instance shared across
  // multiple editors does not leak completion state between them.
  const typeaheadPlugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet = Decoration.none;
      hint: string | undefined;
      update(update: ViewUpdate) {
        // Only recompute on doc/selection changes; skip unrelated updates on this per-keystroke path.
        if (!update.docChanged && !update.selectionSet) {
          return;
        }

        const builder = new RangeSetBuilder<Decoration>();
        const selection = update.view.state.selection.main;
        const line = update.view.state.doc.lineAt(selection.from);

        // TODO(burdon): Check at end of line and matches start of previous word.
        // TODO(burdon): Context grammar.
        this.hint = undefined;
        if (selection.from === selection.to && selection.from === line.to) {
          const str = update.state.sliceDoc(line.from, selection.from);
          this.hint = onComplete?.({ line: str });
          if (this.hint) {
            builder.add(selection.from, selection.to, Decoration.widget({ widget: new PlaceholderWidget(this.hint) }));
          }
        }

        this.decorations = builder.finish();
      }
    },
    {
      decorations: (value) => value.decorations,
    },
  );

  const complete: Command = (view: EditorView) => {
    const hint = view.plugin(typeaheadPlugin)?.hint;
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
    typeaheadPlugin,

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
