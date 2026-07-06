//
// Copyright 2026 DXOS.org
//

import { type EditorState, type Extension, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { debounce } from '@dxos/async';
import { type Document, type Upos, sourceHash } from '@dxos/nlp';

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
    '.cm-pos': {
      borderRadius: '0.125rem',
    },
    ...Object.fromEntries(
      Object.entries(POS_HUE).map(([upos, hue]) => [
        `.cm-pos-${upos}`,
        {
          borderBottom: `2px solid var(--color-${hue}-500)`,
        },
      ]),
    ),
    '.cm-pos-stale': {
      opacity: '0.4',
    },
  });

/** A span has diverged when the current text under its (mapped) range no longer matches its hash. */
export const spanDiverged = (docText: string, span: { from: number; to: number; sourceHash: string }): boolean =>
  sourceHash(docText.slice(span.from, span.to)) !== span.sourceHash;

export type PosOptions = {
  /** When set, the extension self-parses on idle and dispatches `setAnalysis`. */
  parse?: (text: string) => Promise<Document>;
  /** Idle debounce before reactive parsing (ms). */
  debounceMs?: number;
};

/**
 * Reactive driver: on doc change, mark edit-touched spans stale (immediate visual feedback), then
 * after idle re-parse and dispatch fresh analysis. Re-hashing is bounded to spans overlapping the
 * edit. This driver intentionally treats the whole document as a single span; per-span/sub-document
 * analysis is left to external drivers dispatching `setAnalysis` (e.g. the transcription pipeline).
 */
const reactiveDriver = (parse: NonNullable<PosOptions['parse']>, debounceMs: number): Extension => {
  // Monotonic id so a slow parse that resolves after a newer one (or after the doc moved on) is
  // discarded rather than overwriting current analysis with stale spans. Parser rejections are
  // swallowed so they don't surface as unhandled rejections and the prior analysis is preserved.
  let latest = 0;
  const applyParse = (view: EditorView) => {
    const text = view.state.doc.toString();
    const id = ++latest;
    void parse(text)
      .then((document) => {
        if (id !== latest || view.state.doc.toString() !== text) {
          return;
        }
        view.dispatch({ effects: setAnalysis.of({ from: 0, to: text.length, document }) });
      })
      .catch(() => {});
  };

  const run = debounce((view: EditorView) => applyParse(view), debounceMs);

  // Parse existing content on mount so reactive mode decorates immediately, not just after an edit.
  // Dispatch is deferred via the parse promise's microtask; CodeMirror forbids dispatching during construction.
  const initial = ViewPlugin.define((view) => {
    if (view.state.doc.length > 0) {
      applyParse(view);
    }
    return {};
  });

  const onEdit = EditorView.updateListener.of((update: ViewUpdate) => {
    if (!update.docChanged) {
      return;
    }
    // Collect the post-edit ranges this transaction touched; re-hashing is bounded to spans that
    // overlap them, so cost scales with the edit, not the total analyzed text.
    const touched: Array<[number, number]> = [];
    update.changes.iterChangedRanges((_fromA, _toA, fromB, toB) => touched.push([fromB, toB]));
    const overlapsEdit = (span: PosSpan) => touched.some(([from, to]) => from <= span.to && to >= span.from);

    // Immediate: mark any diverged touched span stale so its decorations dim until the re-parse lands.
    const text = update.state.doc.toString();
    const effects = update.state
      .field(posAnalysisField)
      .filter((span) => !span.stale && overlapsEdit(span) && spanDiverged(text, span))
      .map((span) => markStale.of({ from: span.from, to: span.to }));
    if (effects.length > 0) {
      update.view.dispatch({ effects });
    }
    run(update.view);
  });

  return [initial, onEdit];
};

/**
 * Part-of-speech decoration extension.
 * Renders per-word UPOS marks from analysis state held in a span-oriented state field.
 * State can be set externally via `setAnalysis`/`clearAnalysis`,
 * or — when `options.parse` is supplied — self-driven on idle (reactive mode).
 */
export const pos = (options: PosOptions = {}): Extension => {
  const extensions: Extension[] = [posAnalysisField, posDecorations, posTheme()];
  if (options.parse) {
    extensions.push(reactiveDriver(options.parse, options.debounceMs ?? 500));
  }

  return extensions;
};
