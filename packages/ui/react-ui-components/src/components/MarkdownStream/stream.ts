//
// Copyright 2025 DXOS.org
//

import { Effect, Stream } from 'effect';

/**
 * Streams text character by character with a delay, but keeps XML/HTML tags intact.
 */
export const createStreamer =
  (characterDelay = 0) =>
  (source: Stream.Stream<string>) =>
    source.pipe(
      Stream.flatMap((chunk) =>
        Stream.fromIterable(tokenizeWithTags(chunk)).pipe(
          Stream.flatMap((token) => Stream.succeed(token).pipe(Stream.tap(() => Effect.sleep(characterDelay)))),
        ),
      ),
    );

/**
 * Tokenizes a string into characters and complete XML/HTML tags.
 * For example: "hello <b>world</b>!" becomes ["h", "e", "l", "l", "o", " ", "<b>", "w", "o", "r", "l", "d", "</b>", "!"]
 */
const tokenizeWithTags = (text: string): string[] => {
  const tokens: string[] = [];

  let i = 0;
  while (i < text.length) {
    if (text[i] === '<') {
      // Find the closing bracket.
      const closeIndex = text.indexOf('>', i);
      if (closeIndex !== -1) {
        // Include the complete tag.
        tokens.push(text.slice(i, closeIndex + 1));
        i = closeIndex + 1;
      } else {
        // No closing bracket found, treat as regular character.
        tokens.push(text[i]);
        i++;
      }
    } else {
      // Regular character.
      tokens.push(text[i]);
      i++;
    }
  }

  return tokens;
};
