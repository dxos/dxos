//
// Copyright 2025 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

type Replacement = {
  input: string;
  output: string;
};

/**
 * Default character replacements for common typography.
 */
export const defaultReplacements: Replacement[] = [
  { input: '--', output: '—' },
  { input: '...', output: '…' },
  { input: '->', output: '→' },
  { input: '<-', output: '←' },
  { input: '=>', output: '⇒' },
  { input: '<=>', output: '⇔' },
  { input: '+-', output: '±' },
  { input: '!=', output: '≠' },
  { input: '<=', output: '≤' },
  { input: '>=', output: '≥' },
  { input: '(c)', output: '©' },
  { input: 'EUR', output: '€' },
  { input: 'GBP', output: '£' },
  { input: 'BTC', output: '₿' },
];

/**
 * Options for the replacer extension.
 */
export interface ReplacerOptions {
  replacements?: Replacement[];
}

/**
 * Creates a CodeMirror extension that automatically replaces typed character sequences.
 */
export const replacer = ({ replacements = defaultReplacements }: ReplacerOptions = {}): Extension => {
  // Sort replacements by input length (longest first) to handle overlapping patterns correctly.
  const sortedReplacements = [...replacements].sort((a, b) => b.input.length - a.input.length);

  return EditorView.inputHandler.of((view, from, to, insert) => {
    // Only process single character insertions for performance.
    if (insert.length !== 1) {
      return false;
    }

    const state = view.state;
    const doc = state.doc;

    // Get the text before the insertion point to check for patterns.
    const lineStart = doc.lineAt(from).from;
    const textBefore = doc.sliceString(lineStart, from);
    const textWithInsert = textBefore + insert;

    // Check each replacement pattern.
    for (const replacement of sortedReplacements) {
      if (textWithInsert.endsWith(replacement.input)) {
        const range = {
          from: from - replacement.input.length + 1,
          to: from,
        };

        // Ensure we don't go before the line start.
        if (range.from < lineStart) {
          continue;
        }

        // Create the replacement transaction.
        view.dispatch(
          state.update({
            changes: {
              ...range,
              insert: replacement.output,
            },
            selection: {
              anchor: range.from + replacement.output.length,
            },
          }),
        );

        return true;
      }
    }

    return false;
  });
};
