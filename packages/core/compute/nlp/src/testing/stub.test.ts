//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { stubParse, stubTag } from './stub';

describe('stubTag', () => {
  test('tags closed-class words from the lexicon and splits sentences', ({ expect }) => {
    const sentences = stubTag('The dog runs. It barks!');
    expect(sentences).toHaveLength(2);
    const first = sentences[0].tokens;
    expect(first.find((t) => t.text === 'The')?.upos).toBe('DET');
    expect(first.find((t) => t.text === '.')?.upos).toBe('PUNCT');
  });

  test('tags capitalized non-initial words as PROPN', ({ expect }) => {
    const [sentence] = stubTag('I met Alice today');
    expect(sentence.tokens.find((t) => t.text === 'Alice')?.upos).toBe('PROPN');
  });
});

describe('stubParse', () => {
  test('returns an aligned Document with exact offsets', async ({ expect }) => {
    const source = 'The dog runs.';
    const doc = await stubParse(source);
    expect(doc.sourceHash).toBeTypeOf('string');
    expect(doc.sentences[0].tokens.map((t) => source.slice(t.start, t.end))).toContain('dog');
  });
});
