//
// Copyright 2026 DXOS.org
//

import { type CompletionContext, type CompletionResult, autocompletion } from '@codemirror/autocomplete';
import { type Extension } from '@codemirror/state';

import { fieldCompletionContext } from './completion.ts';

/** Field-name completions inside a Spec fenced block, from {@link fieldCompletionContext}. */
const mdlCompletionSource = (context: CompletionContext): CompletionResult | null => {
  const found = fieldCompletionContext(context.state.doc.toString(), context.pos);
  if (!found) {
    return null;
  }
  const word = context.matchBefore(/\w[\w-]*/);
  if (!word && !context.explicit) {
    return null;
  }

  return {
    from: word ? word.from : context.pos,
    options: found.fields.map((field) => ({
      label: field,
      type: 'property',
      apply: `${field}: `,
    })),
  };
};

/**
 * Autocompletion extension for Spec .mdl documents.
 */
export const mdlComplete: Extension = autocompletion({ override: [mdlCompletionSource] });
