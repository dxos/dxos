//
// Copyright 2026 DXOS.org
//

import { random } from '@dxos/random';

export type TextStreamOptions = {
  /** Delay between chunks in ms. */
  chunkDelay?: number;
  /** Variance in timing (0-1). */
  variance?: number;
  /** Words per chunk. */
  wordsPerChunk?: number;
};

/**
 * Word-by-word stream, the shape a model emits: chunks of a few words at an uneven cadence.
 *
 * Whitespace is preserved as its own token so a chunk boundary never fuses two words, which would
 * corrupt the markdown the item is parsing mid-stream.
 */
export async function* textStream(text: string, options: TextStreamOptions = {}): AsyncGenerator<string, void> {
  const { chunkDelay = 120, variance = 0.4, wordsPerChunk = 4 } = options;
  const tokens = text.match(/\S+|\s+/g) ?? [];

  let index = 0;
  while (index < tokens.length) {
    const chunk: string[] = [];
    let words = 0;
    while (index < tokens.length && words < wordsPerChunk) {
      const token = tokens[index++];
      chunk.push(token);
      if (token.trim()) {
        words++;
      }
    }

    yield chunk.join('');
    await new Promise((resolve) => setTimeout(resolve, chunkDelay * (1 + (Math.random() - 0.5) * variance * 2)));
  }
}

/**
 * A plausible assistant answer: prose, a list, a code block and a closing paragraph — enough
 * structure that the item re-parses markdown as the text arrives, rather than growing one flat
 * paragraph.
 */
export const createAnswer = (): string =>
  [
    random.lorem.paragraph(),
    '',
    `## ${random.lorem.sentence(3)}`,
    '',
    random.lorem.paragraph(),
    '',
    `- **${random.lorem.words(2)}** — ${random.lorem.sentence(8)}`,
    `- **${random.lorem.words(2)}** — ${random.lorem.sentence(10)}`,
    `- **${random.lorem.words(2)}** — ${random.lorem.sentence(6)}`,
    '',
    '```ts',
    'const feed = useQuery(db, Query.from(feed));',
    'const hits = searchFeed(messages, renderer, query);',
    '```',
    '',
    random.lorem.paragraph(),
  ].join('\n');
