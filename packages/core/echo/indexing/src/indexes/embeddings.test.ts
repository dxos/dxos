//
// Copyright 2025 DXOS.org
//

import * as Orama from '@orama/orama';
import { pipeline } from '@xenova/transformers';
import { describe, expect, test } from 'vitest';

import { TestData } from '../testing';

import { EmbeddingExtractor, breakIntoChunks } from './embeddings';
import type { ExtractInputBlock } from './text';

// Associated research: https://chatgpt.com/share/6828c870-7f08-8012-b4d6-676f00545e79

// Alternative to Orama from vector index search: hnswlib-wasm

// TODO(mykola): Exceeded ratelimit for huggingface.
describe.skip('Embeddings', () => {
  test.skip('should create embeddings', async () => {
    // Create the feature-extraction pipeline for the chosen model
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

    // In node and browser, 20ms startup time and 6ms per embedding of a short sentence.
    // This scales quadratically with the number of input tokens in a chunk.
    for (let i = 0; i < 50; i++) {
      // Example: compute embeddings for multiple chunks with mean pooling and normalization
      const chunks = ['This is first chunk.', 'This is second chunk.'];
      console.time('embeddings short');
      const embeddings = await extractor(chunks, { pooling: 'mean', normalize: true });
      console.timeEnd('embeddings short');
      console.log(embeddings.dims); // [2, 384] for L6-v2 model:contentReference[oaicite:39]{index=39}
    }

    // 109ms for 175 words
    console.log({ words: TEST_ARTICLES.marineLife.split(' ').length });
    for (let i = 0; i < 50; i++) {
      console.time('embeddings long');
      const embeddings = await extractor(TEST_ARTICLES.marineLife, { pooling: 'mean', normalize: true });
      console.timeEnd('embeddings long');
      console.log(embeddings.dims); // [2, 384] for L6-v2 model:contentReference[oaicite:39]{index=39}
    }
  });

  test('vector search with orama', { timeout: 20_000 }, async () => {
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

    type Record = {
      id: string;
      content: string;
      embedding?: number[];
    };

    const records: Record[] = await Promise.all(
      Object.entries(TEST_ARTICLES).map(async ([id, content]): Promise<Record> => {
        const embedding = await extractor(content, { pooling: 'mean', normalize: true });
        const vector = embedding.tolist()[0];

        return {
          id,
          content,
          embedding: vector,
        };
      }),
    );

    const orama = await Orama.create({
      schema: {
        content: 'string',
        embedding: 'vector[384]',
      },
    });
    await Orama.insertMultiple(orama, records);

    const search = async (term: string) => {
      const embedding = await extractor(term, { pooling: 'mean', normalize: true });
      const vector = embedding.tolist()[0];

      return Orama.search(orama, {
        mode: 'hybrid',
        term,
        vector: {
          value: vector,
          property: 'embedding',
        },
        similarity: 0.2, // Minimum vector search similarity. Defaults to `0.8`
        includeVectors: true, // Defaults to `false`
        limit: 10, // Defaults to `10`
        offset: 0, // Defaults to `0`
      });
    };

    const QUERIES = [
      //
      'elephant seals',
      'will it rain?',
      'warsaw weather',

      'synthetic heart production', // purely vector
    ];

    for (const query of QUERIES) {
      const results = await search(query);
      console.log(query, results);
    }
  });
});

// TODO(mykola): Exceeded ratelimit for huggingface.
describe.skip('EmbeddingExtractor', { timeout: 20_000 }, () => {
  test('should create embeddings', async () => {
    const extractor = new EmbeddingExtractor();
    const embeddings = await extractor.extract([{ content: TEST_ARTICLES.marineLife }]);
    expect(embeddings.length).toBe(1);
    expect(embeddings[0].length).toBe(384);
  });

  describe('breakIntoChunks', () => {
    test('large', () => {
      const CHUNK_SIZE = 500;
      const chunks = breakIntoChunks([{ content: TEST_ARTICLES.marineLife }], CHUNK_SIZE);
      expect(chunks.every((chunk) => chunk.content.length <= CHUNK_SIZE)).toBe(true);
      expect(chunks).toMatchInlineSnapshot(`
        [
          {
            "content": "Many marine animals migrate between foraging areas and reproductive sites, often timing the return migration with extreme precision. In theory, the decision to return should reflect energy acquisition at foraging areas, energetic costs associated with transit, and timing arrival for successful reproduction. ",
          },
          {
            "content": "For long-distance migrations to be successful, animals must integrate ‘map’ information to assess where they are relative to their reproductive site as well as ‘calendar’ information to know when to initiate the return migration given their distance from home1. Elephant seals, Mirounga angustirostris, migrate thousands of kilometers from reproductive sites to open ocean foraging areas (Figure 1A), yet return within a narrow window of time to specific beaches2. ",
          },
          {
            "content": "Each year, pregnant female elephant seals undertake a ∼240-day, 10,000 km foraging migration across the Northeast Pacific Ocean before returning to their breeding beaches, where they give birth 5 days after arriving2. We found that the seals’ abilities to adjust the timing of their return migration is based on the perception of space and time, which further elucidates the mechanisms behind their astonishing navigational feats3.",
          },
        ]
      `);
      assertAllWordsAppear(TEST_ARTICLES.marineLife, chunks);
    });

    test('medium', () => {
      const CHUNK_SIZE = 100;
      const chunks = breakIntoChunks([{ content: TEST_ARTICLES.marineLife }], CHUNK_SIZE);
      expect(chunks.every((chunk) => chunk.content.length <= CHUNK_SIZE)).toBe(true);
      expect(chunks).toMatchInlineSnapshot(`
        [
          {
            "content": "Many marine animals migrate between foraging areas and reproductive sites, often timing the return ",
          },
          {
            "content": "migration with extreme precision. ",
          },
          {
            "content": "In theory, the decision to return should reflect energy acquisition at foraging areas, energetic ",
          },
          {
            "content": "costs associated with transit, and timing arrival for successful reproduction. ",
          },
          {
            "content": "For long-distance migrations to be successful, animals must integrate ‘map’ information to assess ",
          },
          {
            "content": "where they are relative to their reproductive site as well as ‘calendar’ information to know when ",
          },
          {
            "content": "to initiate the return migration given their distance from home1. ",
          },
          {
            "content": "Elephant seals, Mirounga angustirostris, migrate thousands of kilometers from reproductive sites to ",
          },
          {
            "content": "open ocean foraging areas (Figure 1A), yet return within a narrow window of time to specific ",
          },
          {
            "content": "beaches2. ",
          },
          {
            "content": "Each year, pregnant female elephant seals undertake a ∼240-day, 10,000 km foraging migration across ",
          },
          {
            "content": "the Northeast Pacific Ocean before returning to their breeding beaches, where they give birth 5 ",
          },
          {
            "content": "days after arriving2. ",
          },
          {
            "content": "We found that the seals’ abilities to adjust the timing of their return migration is based on the ",
          },
          {
            "content": "perception of space and time, which further elucidates the mechanisms behind their astonishing ",
          },
          {
            "content": "navigational feats3.",
          },
        ]
      `);
      assertAllWordsAppear(TEST_ARTICLES.marineLife, chunks);
    });

    test('small', () => {
      const CHUNK_SIZE = 50;
      const chunks = breakIntoChunks([{ content: TEST_ARTICLES.marineLife }], CHUNK_SIZE);
      expect(chunks.every((chunk) => chunk.content.length <= CHUNK_SIZE)).toBe(true);
      expect(chunks).toMatchInlineSnapshot(`
        [
          {
            "content": "Many marine animals migrate between foraging ",
          },
          {
            "content": "areas and reproductive sites, often timing the ",
          },
          {
            "content": "return migration with extreme precision. ",
          },
          {
            "content": "In theory, the decision to return should reflect ",
          },
          {
            "content": "energy acquisition at foraging areas, energetic ",
          },
          {
            "content": "costs associated with transit, and timing arrival ",
          },
          {
            "content": "for successful reproduction. ",
          },
          {
            "content": "For long-distance migrations to be successful, ",
          },
          {
            "content": "animals must integrate ‘map’ information to ",
          },
          {
            "content": "assess where they are relative to their ",
          },
          {
            "content": "reproductive site as well as ‘calendar’ ",
          },
          {
            "content": "information to know when to initiate the return ",
          },
          {
            "content": "migration given their distance from home1. ",
          },
          {
            "content": "Elephant seals, Mirounga angustirostris, migrate ",
          },
          {
            "content": "thousands of kilometers from reproductive sites ",
          },
          {
            "content": "to open ocean foraging areas (Figure 1A), yet ",
          },
          {
            "content": "return within a narrow window of time to specific ",
          },
          {
            "content": "beaches2. ",
          },
          {
            "content": "Each year, pregnant female elephant seals ",
          },
          {
            "content": "undertake a ∼240-day, 10,000 km foraging ",
          },
          {
            "content": "migration across the Northeast Pacific Ocean ",
          },
          {
            "content": "before returning to their breeding beaches, where ",
          },
          {
            "content": "they give birth 5 days after arriving2. ",
          },
          {
            "content": "We found that the seals’ abilities to adjust the ",
          },
          {
            "content": "timing of their return migration is based on the ",
          },
          {
            "content": "perception of space and time, which further ",
          },
          {
            "content": "elucidates the mechanisms behind their ",
          },
          {
            "content": "astonishing navigational feats3.",
          },
        ]
      `);
      assertAllWordsAppear(TEST_ARTICLES.marineLife, chunks);
    });
  });
});

const TEST_ARTICLES = {
  marineLife: TestData.ARTICLES.marineLife.doc.data.content,
  warsawWeather: TestData.ARTICLES.warsawWeather.doc.data.content,
  developmentsInBiomedicine: TestData.ARTICLES.developmentsInBiomedicine.doc.data.content,
};

const assertAllWordsAppear = (original: string, chunks: ExtractInputBlock[]) => {
  const words = original
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z]/g, ''));
  const chunkWords = chunks.map((chunk) =>
    chunk.content
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.replace(/[^a-z]/g, '')),
  );
  for (const word of words) {
    if (!word) {
      continue;
    } // Skip empty strings after filtering
    expect(chunkWords.some((chunk) => chunk.includes(word))).toBe(true);
  }
};
