//
// Copyright 2026 DXOS.org
//

import { LanguageDescription, syntaxHighlighting } from '@codemirror/language';
import { Compartment, type Extension } from '@codemirror/state';
import { type EditorView, ViewPlugin } from '@codemirror/view';

/**
 * `codemirror-lang-mermaid` ships its parser tables in the same module as its tags (~165 KB), so a
 * static import of either put the whole grammar in every tab's boot graph. Both the language and
 * its highlight style now load together, the first time a document actually contains a mermaid
 * fence.
 */
const mermaidHighlighting = new Compartment();

/** Views carrying the lazy highlighting slot, reconfigured once the grammar loads. */
const pendingViews = new Set<EditorView>();
let highlightingLoaded = false;

const installHighlighting = async (): Promise<void> => {
  if (highlightingLoaded) {
    return;
  }
  highlightingLoaded = true;
  const { mermaidHighlightStyle } = await import('./mermaid');
  const extension = syntaxHighlighting(mermaidHighlightStyle());
  for (const view of pendingViews) {
    view.dispatch({ effects: mermaidHighlighting.reconfigure(extension) });
  }
  pendingViews.clear();
};

/**
 * Mermaid fenced-code support. CodeMirror calls `load` when it first parses a mermaid fence, which
 * is also the moment the highlight style becomes observable — so both arrive on the same import.
 */
export const mermaidLanguageDescription = LanguageDescription.of({
  name: 'mermaid',
  alias: ['mermaid'],
  extensions: ['mmd'],
  load: async () => {
    const [{ mermaid }] = await Promise.all([import('codemirror-lang-mermaid'), installHighlighting()]);
    return mermaid();
  },
});

/** Slot that receives the mermaid highlight style once the grammar loads. */
export const lazyMermaidHighlighting = (): Extension => [
  mermaidHighlighting.of([]),
  ViewPlugin.define((view) => {
    if (!highlightingLoaded) {
      pendingViews.add(view);
    }
    return {
      destroy: () => pendingViews.delete(view),
    };
  }),
];
