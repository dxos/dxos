//
// Copyright 2026 DXOS.org
//

import { type EditorState, type Extension, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';

import { type Document, type Upos } from '@dxos/nlp';

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

/** One mark per UPOS tag; CSS class drives color (see `posTheme`). Stale spans add `cm-pos-stale`. */
const posMark = (upos: Upos, stale: boolean) =>
  Decoration.mark({ class: ['cm-pos', `cm-pos-${upos}`, stale && 'cm-pos-stale'].filter(Boolean).join(' ') });

export const posDecorations = EditorView.decorations.compute([posAnalysisField], (state) => {
  const builder = new RangeSetBuilder<Decoration>();
  const spans = state.field(posAnalysisField);
  // Tokens are span-relative; absolute offset = span.from + token.start. Sort by absolute start so
  // the RangeSetBuilder receives ranges in non-decreasing order.
  const marks = spans
    .flatMap((span) =>
      span.document.sentences.flatMap((sentence) =>
        sentence.tokens.map((token) => ({
          from: span.from + token.start,
          to: span.from + token.end,
          deco: posMark(token.upos, span.stale),
        })),
      ),
    )
    .filter((mark) => mark.to <= state.doc.length && mark.from < mark.to)
    .sort((markA, markB) => markA.from - markB.from || markA.to - markB.to);
  for (const mark of marks) {
    builder.add(mark.from, mark.to, mark.deco);
  }
  return builder.finish();
});

// UPOS → ui-theme hue. Content classes (NOUN/VERB/ADJ/ADV/PROPN/NUM) get distinct hues; function
// words share a muted neutral; PUNCT/SYM/X are unstyled.
const POS_HUE: Partial<Record<Upos, string>> = {
  NOUN: 'blue',
  PROPN: 'indigo',
  VERB: 'red',
  ADJ: 'green',
  ADV: 'amber',
  NUM: 'cyan',
  INTJ: 'pink',
  PRON: 'neutral',
  DET: 'neutral',
  ADP: 'neutral',
  AUX: 'neutral',
  CCONJ: 'neutral',
  SCONJ: 'neutral',
  PART: 'neutral',
};

export const posTheme = (): Extension =>
  EditorView.theme({
    '.cm-pos': { borderRadius: '0.125rem' },
    ...Object.fromEntries(
      Object.entries(POS_HUE).map(([upos, hue]) => [
        `.cm-pos-${upos}`,
        { borderBottom: `2px solid var(--color-${hue}-500)` },
      ]),
    ),
    '.cm-pos-stale': { opacity: '0.4' },
  });
