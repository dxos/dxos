//
// Copyright 2026 DXOS.org
//

import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, test } from 'vitest';

import { type Document, sourceHash } from '@dxos/nlp';

import {
  clearAnalysis,
  pos,
  posAnalysisField,
  posDecorations,
  posSpans,
  posTokenAt,
  setAnalysis,
  spanDiverged,
} from './pos';

describe('posAnalysisField', () => {
  const make = (doc = 'hello world') => EditorState.create({ doc, extensions: [posAnalysisField] });

  test('setAnalysis adds a span', ({ expect }) => {
    const state = make().update({ effects: setAnalysis.of({ from: 0, to: 5, document: docFor('hello') }) }).state;
    expect(posSpans(state)).toHaveLength(1);
    expect(posSpans(state)[0]).toMatchObject({ from: 0, to: 5, stale: false });
  });

  test('span offsets are mapped through an insertion before them', ({ expect }) => {
    const withSpan = make().update({ effects: setAnalysis.of({ from: 6, to: 11, document: docFor('world') }) }).state;
    const afterEdit = withSpan.update({ changes: { from: 0, insert: 'XXX' } }).state;
    expect(posSpans(afterEdit)[0]).toMatchObject({ from: 9, to: 14 });
  });

  test('clearAnalysis removes all spans', ({ expect }) => {
    const withSpan = make().update({ effects: setAnalysis.of({ from: 0, to: 5, document: docFor('hello') }) }).state;
    const cleared = withSpan.update({ effects: clearAnalysis.of(null) }).state;
    expect(posSpans(cleared)).toHaveLength(0);
  });
});

describe('posDecorations', () => {
  test('emits decorations for the analyzed tokens', ({ expect }) => {
    const text = 'hello world';
    let state = EditorState.create({ doc: text, extensions: [posAnalysisField, posDecorations] });
    const document: Document = {
      sourceHash: 'deadbeef',
      sentences: [
        {
          index: 0,
          start: 0,
          end: 11,
          tokens: [
            { index: 0, text: 'hello', upos: 'INTJ', start: 0, end: 5 },
            { index: 1, text: 'world', upos: 'NOUN', start: 6, end: 11 },
          ],
        },
      ],
    };
    state = state.update({ effects: setAnalysis.of({ from: 0, to: 11, document }) }).state;
    const sources = state.facet(EditorView.decorations);
    expect(sources.length).toBeGreaterThan(0);
  });
});

describe('pos reactive initial parse', () => {
  test('parses existing content on mount (decorates without an edit)', async ({ expect }) => {
    const text = 'hello world';
    const fakeParse = async (input: string): Promise<Document> => docFor(input);
    const view = new EditorView({ doc: text, extensions: [pos({ parse: fakeParse })] });
    try {
      // The mount parse and its dispatch run as microtasks (no timer); drain the queue rather than
      // sleeping so the assertion is deterministic.
      await flushMicrotasks();
      expect(posSpans(view.state).length).toBe(1);
      expect(posSpans(view.state)[0]).toMatchObject({ from: 0, to: text.length });
    } finally {
      view.destroy();
    }
  });
});

describe('posTokenAt', () => {
  const analyzed = () => {
    const text = 'XX hello world';
    // Span starts at 3 so absolute token offsets exercise the span-relative mapping.
    const document: Document = {
      sourceHash: sourceHash('hello world'),
      sentences: [
        {
          index: 0,
          start: 0,
          end: 11,
          tokens: [
            { index: 0, text: 'hello', upos: 'INTJ', start: 0, end: 5 },
            { index: 1, text: 'world', upos: 'NOUN', start: 6, end: 11 },
          ],
        },
      ],
    };
    return EditorState.create({ doc: text, extensions: [posAnalysisField] }).update({
      effects: setAnalysis.of({ from: 3, to: 14, document }),
    }).state;
  };

  test('resolves the token covering an absolute position', ({ expect }) => {
    const state = analyzed();
    expect(posTokenAt(state, 4)).toMatchObject({ from: 3, to: 8, upos: 'INTJ', stale: false });
    expect(posTokenAt(state, 9)).toMatchObject({ from: 9, to: 14, upos: 'NOUN' });
  });

  test('returns undefined outside analyzed tokens', ({ expect }) => {
    const state = analyzed();
    expect(posTokenAt(state, 0)).toBeUndefined(); // Before the span.
    expect(posTokenAt(state, 8)).toBeUndefined(); // Inter-token whitespace.
  });
});

describe('pos options', () => {
  test('popover option mounts alongside the underline default', ({ expect }) => {
    // Both presentations are independent extensions; constructing a state with each combination
    // must not throw and must retain the analysis field.
    for (const options of [{ popover: true }, { underline: false, popover: true }, { underline: false }]) {
      const state = EditorState.create({ doc: 'hello', extensions: [pos(options)] });
      expect(posSpans(state)).toEqual([]);
    }
  });
});

describe('spanDiverged', () => {
  test('detects when live span text no longer matches the stored hash', ({ expect }) => {
    const span = { from: 0, to: 5, sourceHash: sourceHash('hello'), document: docFor('hello'), stale: false };
    expect(spanDiverged('hello world', span)).toBe(false);
    expect(spanDiverged('hELLo world', span)).toBe(true);
  });
});

/** A minimal single-token `Document` whose hash matches `text`. */
const docFor = (text: string): Document => ({
  sourceHash: sourceHash(text),
  sentences: [
    { index: 0, start: 0, end: text.length, tokens: [{ index: 0, text, upos: 'NOUN', start: 0, end: text.length }] },
  ],
});

/** Drain the microtask queue so chained `.then` callbacks settle without a real timer. */
const flushMicrotasks = async (ticks = 4): Promise<void> => {
  for (let index = 0; index < ticks; index++) {
    await Promise.resolve();
  }
};
