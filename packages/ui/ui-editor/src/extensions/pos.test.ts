//
// Copyright 2026 DXOS.org
//

import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, test } from 'vitest';

import { type Document } from '@dxos/nlp';

import { clearAnalysis, posAnalysisField, posDecorations, posSpans, setAnalysis } from './pos';

const docFor = (text: string): Document => ({
  sourceHash: 'deadbeef',
  sentences: [
    { index: 0, start: 0, end: text.length, tokens: [{ index: 0, text, upos: 'NOUN', start: 0, end: text.length }] },
  ],
});

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
