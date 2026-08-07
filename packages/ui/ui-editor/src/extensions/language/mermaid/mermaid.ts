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

/** Views carrying the lazy highlighting slot, reconfigured once the grammar loads. */
const pendingViews = new Set<EditorView>();
let highlightingLoaded = false;

const installHighlighting = async (): Promise<void> => {
  if (highlightingLoaded) {
    return;
  }
  highlightingLoaded = true;
  const { mermaidHighlightStyle } = await import('./highlight');
  const extension = syntaxHighlighting(mermaidHighlightStyle());
  for (const view of pendingViews) {
    view.dispatch({ effects: highlightCompartment.reconfigure(extension) });
  }
  pendingViews.clear();
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

/** Slot that receives the mermaid highlight style once the grammar loads. */
export const mermaidHighlighting = (): Extension => [
  highlightCompartment.of([]),
  ViewPlugin.define((view) => {
    if (!highlightingLoaded) {
      pendingViews.add(view);
    }
    return {
      destroy: () => pendingViews.delete(view),
    };
  }),
];
