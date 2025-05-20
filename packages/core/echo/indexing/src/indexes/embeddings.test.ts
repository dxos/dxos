import { pipeline } from '@xenova/transformers';
import { describe, test } from 'vitest';
import * as Orama from '@orama/orama';
import { TestData } from '../testing';

// Associated research: https://chatgpt.com/share/6828c870-7f08-8012-b4d6-676f00545e79

// Alternative to Orama from vector index search: hnswlib-wasm

describe('Embeddings', () => {
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

  test('vector search with orama', async () => {
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

const TEST_ARTICLES = {
  marineLife: TestData.ARTICLES.marineLife.doc.data.content,
  warsawWeather: TestData.ARTICLES.warsawWeather.doc.data.content,
  developmentsInBiomedicine: TestData.ARTICLES.developmentsInBiomedicine.doc.data.content,
};
