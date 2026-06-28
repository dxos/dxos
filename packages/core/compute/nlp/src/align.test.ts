//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { assembleDocument } from './align';
import { sourceHash } from './hash';

describe('assembleDocument', () => {
  test('assigns exact offsets to each token', ({ expect }) => {
    const source = 'The dog barks.';
    const doc = assembleDocument(source, [
      { tokens: [
        { text: 'The', upos: 'DET' },
        { text: 'dog', upos: 'NOUN' },
        { text: 'barks', upos: 'VERB' },
        { text: '.', upos: 'PUNCT' },
      ] },
    ]);

    const [sentence] = doc.sentences;
    expect(sentence.tokens.map((t) => source.slice(t.start, t.end))).toEqual(['The', 'dog', 'barks', '.']);
    expect(sentence.tokens.map((t) => t.index)).toEqual([0, 1, 2, 3]);
    expect(sentence.start).toBe(0);
    expect(sentence.end).toBe(14);
    expect(doc.sourceHash).toBe(sourceHash(source));
  });

  test('handles repeated words by scanning forward (no re-match of earlier occurrence)', ({ expect }) => {
    const source = 'dog dog';
    const doc = assembleDocument(source, [
      { tokens: [
        { text: 'dog', upos: 'NOUN' },
        { text: 'dog', upos: 'NOUN' },
      ] },
    ]);
    expect(doc.sentences[0].tokens.map((t) => t.start)).toEqual([0, 4]);
  });

  test('skips tokens not found in source rather than throwing', ({ expect }) => {
    const source = 'hello world';
    const doc = assembleDocument(source, [
      { tokens: [
        { text: 'hello', upos: 'INTJ' },
        { text: 'GHOST', upos: 'X' },
        { text: 'world', upos: 'NOUN' },
      ] },
    ]);
    expect(doc.sentences[0].tokens.map((t) => t.text)).toEqual(['hello', 'world']);
  });
});
