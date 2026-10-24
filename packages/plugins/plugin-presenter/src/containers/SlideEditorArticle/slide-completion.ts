//
// Copyright 2026 DXOS.org
//

import { type CompletionContext, type CompletionResult, autocompletion } from '@codemirror/autocomplete';
import { EditorState, type Extension } from '@codemirror/state';

import { type LayoutName, frontmatterCompletion } from '#markdown';

export type SlideCompletionOptions = {
  /** The layout's display name, shown beside its value. */
  describeLayout: (layout: LayoutName) => string;
};

/**
 * Completes frontmatter values in the slide editor: the layouts after `layout:`.
 */
export const slideCompletion = ({ describeLayout }: SlideCompletionOptions): Extension => {
  const source = (context: CompletionContext): CompletionResult | null => {
    const result = frontmatterCompletion(context.state.doc.toString(), context.pos);
    // Typing `layout:` opens the list; anywhere else only an explicit request (Ctrl-Space) would.
    if (!result || (result.prefix === '' && !context.explicit && !context.matchBefore(/:[ \t]*$/))) {
      return null;
    }
    return {
      from: result.from,
      options: result.options.map((layout) => ({ label: layout, detail: describeLayout(layout), type: 'enum' })),
      validFor: /^[\w-]*$/,
    };
  };

  return [
    // A language-data source composes with any other completion source rather than replacing it. The completion plugin
    // matches results to sources by identity, so the provider must return the same function every time.
    EditorState.languageData.of(() => [{ autocomplete: source }]),
    autocompletion({ icons: false }),
  ];
};
