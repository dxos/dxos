// Alternative to Orama from vector index search: hnswlib-wasm
import { pipeline } from '@xenova/transformers';
import { describe, test } from 'vitest';

describe('Embeddings', () => {
  test('should create embeddings', async () => {
    // Create the feature-extraction pipeline for the chosen model
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

    // Example: compute embeddings for multiple chunks with mean pooling and normalization
    const chunks = ['This is first chunk.', 'This is second chunk.'];
    console.time('embeddings');
    const embeddings = await extractor(chunks, { pooling: 'mean', normalize: true });
    console.timeEnd('embeddings');
    console.log(embeddings); // [2, 384] for L6-v2 model:contentReference[oaicite:39]{index=39}
  });
});
