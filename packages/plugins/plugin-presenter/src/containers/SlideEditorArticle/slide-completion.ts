//
// Copyright 2026 DXOS.org
//

import { type CompletionContext, type CompletionResult, autocompletion } from '@codemirror/autocomplete';
import { EditorState, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { type LayoutName, frontmatterCompletion, layoutOptions } from '#markdown';

export type SlideCompletionOptions = {
  /** The layout's display name, shown beside its value. */
  describeLayout: (layout: LayoutName) => string;
};

// Built once: every `EditorView.baseTheme` call mints a new stylesheet, which restyles the whole document.
const slideCompletionTheme = EditorView.baseTheme({
  '.cm-tooltip-autocomplete .cm-completionLabel': { display: 'inline-block', minWidth: '16ch' },
  '.cm-tooltip-autocomplete .cm-completionDetail': {
    marginLeft: '1em',
    fontStyle: 'normal',
    color: 'var(--color-fg-subtle)',
  },
});

/**
 * Completes a slide's frontmatter: the keys it takes while one is being typed, and the values of a key whose
 * values are a fixed set — the layouts after `layout:`, and the options the other enum keys offer.
 */
export const slideCompletion = ({ describeLayout }: SlideCompletionOptions): Extension => {
  const source = (context: CompletionContext): CompletionResult | null => {
    const result = frontmatterCompletion(context.state.doc.toString(), context.pos);
    // Typing a key's colon opens its values; a key on an empty line needs an explicit request (Ctrl-Space).
    if (!result || (result.prefix === '' && !context.explicit && !context.matchBefore(/:[ \t]*$/))) {
      return null;
    }
    const validFor = /^[\w-]*$/;
    // A layout is the one option worth a second column; a key or a plain enum value says what it is.
    const layouts = layoutOptions(result);
    if (layouts) {
      return {
        from: result.from,
        options: layouts.map((layout) => ({ label: layout, detail: describeLayout(layout), type: 'enum' })),
        validFor,
      };
    }
    return {
      from: result.from,
      options: result.options.map((option) => ({ label: option, type: result.kind === 'key' ? 'property' : 'enum' })),
      validFor,
    };
  };

  return [
    // A language-data source composes with any other completion source rather than replacing it. The completion plugin
    // matches results to sources by identity, so the provider must return the same function every time.
    EditorState.languageData.of(() => [{ autocomplete: source }]),
    autocompletion({ icons: false }),
    // Two columns: the value at a fixed width (the longest layout name), then its display name.
    slideCompletionTheme,
  ];
};
