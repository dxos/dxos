//
// Copyright 2026 DXOS.org
//

// Local text embeddings via Ollama's `nomic-embed-text` (768-dim). Kept dependency-light (a direct
// fetch to the Ollama HTTP API) so the vector-index experiment needs no cloud embedding key; run
// `ollama pull nomic-embed-text` first. Endpoint/model come from defs (OLLAMA_ENDPOINT / EMBED_MODEL).
import { EMBED_MODEL, OLLAMA_ENDPOINT } from '../config';

const requestEmbedding = async (
  text: string,
): Promise<{ ok: true; vector: number[] } | { ok: false; error: string }> => {
  const response = await fetch(`${OLLAMA_ENDPOINT}/api/embeddings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
  });
  if (!response.ok) {
    return { ok: false, error: `${response.status} ${await response.text()}` };
  }
  const json = (await response.json()) as { embedding?: number[] };
  return json.embedding && json.embedding.length > 0
    ? { ok: true, vector: json.embedding }
    : { ok: false, error: 'response missing vector' };
};

/** Embeds a single string into a dense vector, halving the input and retrying if the model rejects its length. */
export const embedText = async (text: string): Promise<number[]> => {
  let input = text;
  for (let attempt = 0; attempt < 4; attempt++) {
    const result = await requestEmbedding(input);
    if (result.ok) {
      return result.vector;
    }
    // Context-length overflows shrink and retry; other errors fail fast.
    if (!/context length|too long|exceeds/i.test(result.error) || input.length < 200) {
      throw new Error(`embedding request failed: ${result.error}`);
    }
    input = input.slice(0, Math.floor(input.length / 2));
  }
  throw new Error('embedding request failed: input too long after retries');
};

/** Embeds many strings sequentially (small corpora; keeps Ollama load predictable). */
export const embedBatch = async (texts: readonly string[]): Promise<number[][]> => {
  const vectors: number[][] = [];
  for (const text of texts) {
    vectors.push(await embedText(text));
  }
  return vectors;
};
