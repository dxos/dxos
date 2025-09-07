//
// Copyright 2025 DXOS.org
//

import { useEffect, useState } from 'react';

/**
 * Options for the streaming text generator.
 */
export type StreamingOptions = {
  /** Delay between chunks in ms. */
  chunkDelay?: number;
  /** Variance in timing (0-1). */
  variance?: number;
  /** Number of words per chunk. */
  wordsPerChunk?: number;
};

/**
 * Simulates word-by-word streaming (more natural for LLMs).
 */
export async function* streamWords(
  text: string,
  options: StreamingOptions = {},
): AsyncGenerator<string, void, unknown> {
  const { chunkDelay = 100, variance = 0.3, wordsPerChunk = 3 } = options;

  // Split into words while preserving whitespace.
  const words = text.match(/\S+|\s+/g) || [];

  let i = 0;
  while (i < words.length) {
    // Collect multiple words for this chunk.
    const chunkWords: string[] = [];

    // Add words up to wordsPerChunk (counting only non-whitespace as words).
    let wordCount = 0;
    while (i < words.length && wordCount < wordsPerChunk) {
      const word = words[i];
      chunkWords.push(word);

      // Only count non-whitespace as words.
      if (word.trim()) {
        wordCount++;
      }
      i++;
    }

    // Yield the chunk.
    const chunk = chunkWords.join('');
    yield chunk;

    // Calculate delay based on chunk length.
    const varianceMultiplier = 1 + (Math.random() - 0.5) * variance * 2;
    const delay = chunkDelay * varianceMultiplier;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

/**
 * React hook to consume a streaming generator.
 */
export function useStreamingGenerator(generator: AsyncGenerator<string, void, unknown> | null): [string, boolean] {
  const [text, setText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    if (!generator) {
      setText('');
      return;
    }

    let cancelled = false;
    setIsStreaming(true);
    setText('');

    void (async () => {
      try {
        for await (const chunk of generator) {
          if (cancelled) break;
          setText((prev) => prev + chunk);
        }
      } finally {
        if (!cancelled) {
          setIsStreaming(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      setIsStreaming(false);
    };
  }, [generator]);

  return [text, isStreaming];
}
