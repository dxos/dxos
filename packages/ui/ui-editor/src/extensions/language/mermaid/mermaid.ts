//
// Copyright 2026 DXOS.org
//

import { LanguageDescription, syntaxHighlighting } from '@codemirror/language';
import { Compartment, type Extension } from '@codemirror/state';
import { type EditorView, ViewPlugin } from '@codemirror/view';

/**
 * Mermaid fenced-code support. `codemirror-lang-mermaid` ships its parser tables in the same module
 * as its tags (~165 KB), so both the language and its highlight style load on the first document
 * that actually contains a mermaid fence rather than with the editor.
 */
const highlightCompartment = new Compartment();

/** Views whose highlighting slot is still empty, reconfigured once the style resolves. */
const pendingViews = new Set<EditorView>();

/** Set once the style has resolved, so editors created later start with it rather than empty. */
let highlightExtension: Extension | undefined;

/** Shared while the import is in flight, so concurrent fences load the style once. */
let loading: Promise<void> | undefined;

const installHighlighting = (): Promise<void> => {
  if (highlightExtension) {
    return Promise.resolve();
  }
  loading ??= import('./highlight.ts')
    .then(({ mermaidHighlightStyle }) => {
      highlightExtension = syntaxHighlighting(mermaidHighlightStyle());
      for (const view of pendingViews) {
        view.dispatch({ effects: highlightCompartment.reconfigure(highlightExtension) });
      }
      pendingViews.clear();
    })
    .catch((err) => {
      // Cleared so a later fence retries rather than inheriting a failed load.
      loading = undefined;
      throw err;
    });

  return loading;
};

/** CodeMirror calls `load` when it first parses a mermaid fence. */
export const mermaidLanguageDescription = LanguageDescription.of({
  name: 'mermaid',
  alias: ['mermaid'],
  extensions: ['mmd'],
  load: async () => {
    const [{ mermaid }] = await Promise.all([import('codemirror-lang-mermaid'), installHighlighting()]);
    return mermaid();
  },
});

/** Slot that receives the mermaid highlight style, whether it loads before or after this view. */
export const mermaidHighlighting = (): Extension => [
  highlightCompartment.of(highlightExtension ?? []),
  ViewPlugin.define((view) => {
    if (!highlightExtension) {
      pendingViews.add(view);
    }
    return {
      destroy: () => pendingViews.delete(view),
    };
  }),
];
