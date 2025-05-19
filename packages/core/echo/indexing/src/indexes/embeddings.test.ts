import { pipeline } from '@xenova/transformers';
import { describe, test } from 'vitest';
import * as Orama from '@orama/orama';
import { inspect } from 'node:util';

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
  marineLife: `
    Many marine animals migrate between foraging areas and reproductive sites, often timing the return migration with extreme precision. In theory, the decision to return should reflect energy acquisition at foraging areas, energetic costs associated with transit, and timing arrival for successful reproduction. For long-distance migrations to be successful, animals must integrate ‘map’ information to assess where they are relative to their reproductive site as well as ‘calendar’ information to know when to initiate the return migration given their distance from home1. Elephant seals, Mirounga angustirostris, migrate thousands of kilometers from reproductive sites to open ocean foraging areas (Figure 1A), yet return within a narrow window of time to specific beaches2. Each year, pregnant female elephant seals undertake a ∼240-day, 10,000 km foraging migration across the Northeast Pacific Ocean before returning to their breeding beaches, where they give birth 5 days after arriving2. We found that the seals’ abilities to adjust the timing of their return migration is based on the perception of space and time, which further elucidates the mechanisms behind their astonishing navigational feats3.
  `,
  warsawWeather: `
    Warsaw Weather Forecast. Providing a local hourly Warsaw weather forecast of rain, sun, wind, humidity and temperature.
    The Long-range 12 day forecast also includes detail for Warsaw weather today. Live weather reports from Warsaw weather stations and weather warnings that include risk of thunder, high UV index and forecast gales. See the links below the 12-day Warsaw weather forecast table for other cities and towns nearby along with weather conditions for local outdoor activities.
    Warsaw is 78 m above sea level and located at 52.25° N 21.04° E. Warsaw has a population of 1702139. Local time in Warsaw is 1:57:03 PM CEST.
  `,
  developmentsInBiomedicine: `
    Since the completion of the groundbreaking Human Genome Project, massive strides have been made in our understanding of biology, science, and the human body.
    Many developments have been made on the genetic or cellular level that could have enormous applications for the future.
    But which have been the most important?
    The last decade has already borne significant fruit from 3D printing new organs using stem cells to customizing drug therapies for patients to potentially making human cells virus-proof. As science improves and our understanding grows, the next decade or decades could change healthcare forever. 
  `,
};
