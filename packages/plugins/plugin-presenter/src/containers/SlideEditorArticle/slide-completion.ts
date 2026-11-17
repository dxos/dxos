//
// Copyright 2026 DXOS.org
//

import {
  type CompletionContext,
  type CompletionResult,
  autocompletion,
  completionStatus,
  currentCompletions,
  moveCompletionSelection,
  selectedCompletionIndex,
} from '@codemirror/autocomplete';
import { EditorState, type Extension, Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';

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
 * Arrowing past an end of the list stays there rather than wrapping to the other end, as the default keymap does:
 * the list is short and ordered, so wrapping reads as the selection jumping rather than as having run out. Taking
 * the key (returning true) rather than declining it keeps the caret out of it, which an unhandled arrow would move.
 */
const stopAtEnds = Prec.highest(
  keymap.of(
    (['ArrowDown', 'ArrowUp'] as const).map((key) => ({
      key,
      run: (view: EditorView) => {
        if (completionStatus(view.state) !== 'active') {
          return false;
        }
        const index = selectedCompletionIndex(view.state);
        const forward = key === 'ArrowDown';
        const atEnd = index === null || (forward ? index >= currentCompletions(view.state).length - 1 : index <= 0);
        return atEnd ? index !== null : moveCompletionSelection(forward)(view);
      },
    })),
  ),
);

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
    // Before `autocompletion`, which registers its own keymap at the same (highest) precedence: at equal precedence
    // the handler registered first is asked first, so this one has to come before it to see the arrow at all.
    stopAtEnds,
    autocompletion({ icons: false }),
    // Two columns: the value at a fixed width (the longest layout name), then its display name.
    slideCompletionTheme,
  ];
};
