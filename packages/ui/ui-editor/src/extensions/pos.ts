//
// Copyright 2026 DXOS.org
//

import { type EditorState, StateEffect, StateField } from '@codemirror/state';

import { type Document } from '@dxos/nlp';

/** One analyzed region of the document. `document` offsets are relative to the span's own text. */
export type PosSpan = {
  from: number;
  to: number;
  /** Hash of the source text the analysis covers; compared to live text to detect divergence. */
  sourceHash: string;
  document: Document;
  /** True once the underlying text diverged from `sourceHash` (decorations render dimmed). */
  stale: boolean;
};

/** Replace/add the analysis for a region. */
export const setAnalysis = StateEffect.define<{ from: number; to: number; document: Document }>();

/** Remove all analysis spans. */
export const clearAnalysis = StateEffect.define<null>();

/** Internal: mark a span stale (dispatched by the reactive driver on divergence). */
export const markStale = StateEffect.define<{ from: number; to: number }>();

export const posAnalysisField = StateField.define<PosSpan[]>({
  create: () => [],
  update: (spans, tr) => {
    let next = spans;

    // Map existing span ranges through document changes so anchors follow edits.
    if (tr.docChanged) {
      next = next.map((span) => ({
        ...span,
        from: tr.changes.mapPos(span.from, 1),
        to: tr.changes.mapPos(span.to, -1),
      }));
    }

    for (const effect of tr.effects) {
      if (effect.is(setAnalysis)) {
        const { from, to, document } = effect.value;
        // Replace any span at the same anchor; otherwise append.
        const without = next.filter((span) => !(span.from === from && span.to === to));
        next = [...without, { from, to, sourceHash: document.sourceHash, document, stale: false }];
      } else if (effect.is(clearAnalysis)) {
        next = [];
      } else if (effect.is(markStale)) {
        const { from, to } = effect.value;
        next = next.map((span) => (span.from === from && span.to === to ? { ...span, stale: true } : span));
      }
    }

    return next;
  },
});

/** Read the current analysis spans from editor state. */
export const posSpans = (state: EditorState): PosSpan[] => state.field(posAnalysisField);
