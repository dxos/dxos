//
// Copyright 2026 DXOS.org
//

/** Default upper bound on chunk size (characters); keeps each extraction prompt within model limits. */
export const DEFAULT_MAX_CHUNK_CHARS = 1500;

/**
 * Split text into analyzable chunks at sentence boundaries, packing consecutive sentences up to
 * `maxChars`. A single sentence longer than `maxChars` is hard-split. This bounds the per-chunk
 * extraction prompt so large documents don't exceed the model's input limit (one chunk = one LLM
 * call). Deterministic and pure.
 */
export const chunk = (text: string, maxChars: number = DEFAULT_MAX_CHUNK_CHARS): string[] => {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const chunks: string[] = [];
  let current = '';
  const flush = () => {
    if (current.length > 0) {
      chunks.push(current);
      current = '';
    }
  };

  for (const sentence of segmentSentences(trimmed)) {
    // A single sentence over the budget can't be packed — flush, then hard-split it.
    if (sentence.length > maxChars) {
      flush();
      for (let offset = 0; offset < sentence.length; offset += maxChars) {
        const slice = sentence.slice(offset, offset + maxChars).trim();
        if (slice.length > 0) {
          chunks.push(slice);
        }
      }
      continue;
    }

    // +1 for the joining space.
    if (current.length > 0 && current.length + sentence.length + 1 > maxChars) {
      flush();
    }
    current = current.length > 0 ? `${current} ${sentence}` : sentence;
  }
  flush();

  return chunks;
};

/** Sentence segmentation via `Intl.Segmenter` (browser + node), with a punctuation-split fallback. */
const segmentSentences = (text: string): string[] => {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
    return [...segmenter.segment(text)].map(({ segment }) => segment.trim()).filter((value) => value.length > 0);
  }
  return text
    .split(/(?<=[.!?])\s+/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
};
