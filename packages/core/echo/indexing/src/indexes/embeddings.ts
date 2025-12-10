//
// Copyright 2025 DXOS.org
//

import type { FeatureExtractionPipeline } from '@xenova/transformers';

import { Resource } from '@dxos/context';

import type { ExtractInputBlock } from './text';

export interface EmbeddingExtractorOptions {
  /**
   * Extraction model to use.
   */
  model: string;

  /**
   * Combine all chunks into a single vector.
   */
  chunkCombination: 'disabled' | 'mean' | 'max';

  /**
   * In characters.
   */
  maxChunkSize: number;
}

const DEFAULT_OPTIONS: EmbeddingExtractorOptions = {
  model: 'Xenova/all-MiniLM-L6-v2',
  chunkCombination: 'mean',

  maxChunkSize: 500,
};

export class EmbeddingExtractor extends Resource {
  private _options: EmbeddingExtractorOptions;

  private _extractor?: FeatureExtractionPipeline = undefined;

  constructor(options: Partial<EmbeddingExtractorOptions> = {}) {
    super();
    this._options = { ...DEFAULT_OPTIONS, ...options };
  }

  protected override async _open(): Promise<void> {
    const { pipeline } = await import('@xenova/transformers');
    this._extractor = await pipeline('feature-extraction', this._options.model);
  }

  protected override async _close(): Promise<void> {
    await this._extractor?.dispose();
  }

  /**
   * Extracts embeddings from the object.
   * @returns Embeddings for each chunk of the object or a single embedding if chunks are combined.
   */
  async extract(data: ExtractInputBlock[]): Promise<number[][]> {
    const { pipeline } = await import('@xenova/transformers');
    const extractor = await pipeline('feature-extraction', this._options.model);

    const chunks = breakIntoChunks(data, this._options.maxChunkSize);

    const embedding = await extractor(
      chunks.map((block) => block.content),
      {
        pooling: 'mean',
        normalize: true,
      },
    );

    let vectors = embedding.tolist();

    vectors = combineChunks(vectors, this._options.chunkCombination);

    return vectors;
  }
}

const combineChunks = (
  vectors: number[][],
  chunkCombination: EmbeddingExtractorOptions['chunkCombination'],
): number[][] => {
  switch (chunkCombination) {
    case 'mean': {
      const combined: number[] = Array(vectors[0].length).fill(0);
      for (const vector of vectors) {
        for (let i = 0; i < vector.length; i++) {
          combined[i] += vector[i] / vectors.length;
        }
      }
      return [combined.map((value) => value / vectors.length)];
    }

    case 'max': {
      const combined: number[] = Array(vectors[0].length).fill(0);
      for (const vector of vectors) {
        for (let i = 0; i < vector.length; i++) {
          combined[i] = Math.max(combined[i], vector[i]);
        }
      }
      return [combined];
    }
    case 'disabled':
      return vectors;
  }
};

/**
 * Breaks the data into chunks.
 * @param data - The data to break into chunks.
 * @param maxChunkSize - The maximum size of a chunk in characters.
 * @returns The chunks.
 */
export const breakIntoChunks = (data: ExtractInputBlock[], maxChunkSize: number): ExtractInputBlock[] => {
  const chunks: ExtractInputBlock[] = [];

  for (const block of data) {
    // Try to break by paragraphs first
    const paragraphs = block.content.split(/\n\s*\n/);

    for (const paragraph of paragraphs) {
      const content = paragraph.trim();
      if (!content) {
        continue;
      }

      // If paragraph fits within maxChunkSize, add it directly
      if (content.length <= maxChunkSize) {
        chunks.push({ ...block, content });
        continue;
      }

      // Otherwise break into sentences
      const sentences = content.split(/([.!?]+\s+)/);
      let currentChunk = '';

      for (let i = 0; i < sentences.length; i += 2) {
        const sentence = sentences[i];
        const delimiter = sentences[i + 1] || '';
        const sentenceContent = sentence.trim() + delimiter;

        if (!sentenceContent) {
          continue;
        }

        // If adding this sentence would exceed maxChunkSize
        if (currentChunk.length + sentenceContent.length > maxChunkSize) {
          // Save current chunk if we have one
          if (currentChunk) {
            chunks.push({ ...block, content: currentChunk });
            currentChunk = '';
          }

          // If single sentence is too large, need to break it into words
          if (sentenceContent.length > maxChunkSize) {
            const words = sentenceContent.split(/(\s+)/);
            currentChunk = '';

            for (let j = 0; j < words.length; j += 2) {
              const word = words[j];
              const wordDelimiter = words[j + 1] || '';
              const wordContent = word.trim() + wordDelimiter;

              if (!wordContent) {
                continue;
              }

              if (currentChunk.length + wordContent.length > maxChunkSize) {
                if (currentChunk) {
                  chunks.push({ ...block, content: currentChunk });
                  currentChunk = '';
                }
                // If single word is too large, break into characters
                if (wordContent.length > maxChunkSize) {
                  for (let k = 0; k < wordContent.length; k += maxChunkSize) {
                    chunks.push({
                      ...block,
                      content: wordContent.slice(k, k + maxChunkSize),
                    });
                  }
                } else {
                  currentChunk = wordContent;
                }
              } else {
                currentChunk += wordContent;
              }
            }
          } else {
            currentChunk = sentenceContent;
          }
        } else {
          currentChunk += sentenceContent;
        }
      }

      if (currentChunk) {
        chunks.push({ ...block, content: currentChunk });
      }
    }
  }

  return chunks;
};
