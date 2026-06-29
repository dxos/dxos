//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { assembleDocument } from './align';
import { type Parser, stubParse } from './parse';

describe('parser seam', () => {
  test('stubParse satisfies the Parser contract', async ({ expect }) => {
    const parser: Parser = stubParse;
    const doc = await parser('The cat sleeps.');
    expect(doc.sentences[0].tokens.length).toBeGreaterThan(0);
  });

  test('alignment over model-shaped output yields exact offsets', ({ expect }) => {
    const source = 'Alice runs fast.';
    const doc = assembleDocument(source, [
      {
        tokens: [
          { text: 'Alice', upos: 'PROPN' },
          { text: 'runs', upos: 'VERB' },
          { text: 'fast', upos: 'ADV' },
          { text: '.', upos: 'PUNCT' },
        ],
      },
    ]);
    expect(doc.sentences[0].tokens.map((t) => source.slice(t.start, t.end))).toEqual(['Alice', 'runs', 'fast', '.']);
  });
});
