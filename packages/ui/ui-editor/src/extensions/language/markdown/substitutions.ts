//
// Copyright 2025 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';

export type Substitution = Record<string, string>;

/**
 * CodeMirror key binding → inserted text, e.g. `{ 'Alt--': '—' }`.
 * https://codemirror.net/docs/ref/#view.KeyBinding
 */
export type KeyBindings = Record<string, string>;

export type SubstitutionOptions = {
  substitutions?: Substitution;
  bindings?: KeyBindings;
};

/**
 * Substitutes typed sequences and CodeMirror key chords (e.g. `Alt--` → em dash).
 */
export const substitutions = ({
  substitutions = markdownSubstitutions,
  bindings = markdownBindings,
}: SubstitutionOptions = {}): Extension => {
  // Longest first so overlapping patterns match the full sequence.
  const sorted = Object.entries(substitutions).sort(([a], [b]) => b.length - a.length);

  return [
    EditorView.inputHandler.of((view, from, _to, insert) => {
      if (insert.length !== 1) {
        return false;
      }

      const { state } = view;
      const lineStart = state.doc.lineAt(from).from;
      const textWithInsert = state.doc.sliceString(lineStart, from) + insert;

      for (const [input, output] of sorted) {
        if (!textWithInsert.endsWith(input)) {
          continue;
        }

        const rangeFrom = from - input.length + 1;
        if (rangeFrom < lineStart) {
          continue;
        }

        view.dispatch(
          state.update({
            changes: { from: rangeFrom, to: from, insert: output },
            selection: { anchor: rangeFrom + output.length },
          }),
        );
        return true;
      }

      return false;
    }),
    keymap.of(
      Object.entries(bindings).map(([key, output]) => ({
        key,
        preventDefault: true,
        run: (view) => {
          view.dispatch(view.state.replaceSelection(output));
          return true;
        },
      })),
    ),
  ];
};

/**
 * Default typographic sequence substitutions.
 */
export const markdownSubstitutions: Substitution = {
  '...': '…',
  '->': '→',
  '<-': '←',
  '=>': '⇒',
  '<=>': '⇔',
  '<=': '≤',
  '>=': '≥',
  '+-': '±',
  '!=': '≠',
  '(c)': '©',
  'BTC': '₿',
  'EUR': '€',
  'GBP': '£',
  'JPY': '¥',
};

/**
 * Default key-chord substitutions.
 */
export const markdownBindings: KeyBindings = {
  'Alt--': '—',
};
