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
        Stream.fromIterable(tokenizeWithFragments(chunk)).pipe(
          Stream.flatMap((token) => Stream.succeed(token).pipe(Stream.tap(() => Effect.sleep(characterDelay)))),
        ),
      ),
    );

export const tokenizeWithFragments = (text: string): string[] => {
  // First tokenize with tags to get tags as complete tokens.
  const initialTokens = tokenizeWithTags(text);
  const tokens: string[] = [];

  let i = 0;
  while (i < initialTokens.length) {
    const token = initialTokens[i];

    // Check if this is an opening tag.
    if (token.startsWith('<') && !token.startsWith('</') && !token.endsWith('/>')) {
      const tagMatch = token.match(/<(\w+)[^>]*>/);

      if (tagMatch) {
        const tagName = tagMatch[1];
        const closingTag = `</${tagName}>`;

        // Collect tokens until we find the closing tag.
        let fragment = token;
        let j = i + 1;
        let foundClosing = false;

        while (j < initialTokens.length) {
          fragment += initialTokens[j];
          if (initialTokens[j] === closingTag) {
            foundClosing = true;
            break;
          }
          j++;
        }

        if (foundClosing) {
          // Return the complete element as one token.
          tokens.push(fragment);
          i = j + 1;
        } else {
          // No closing tag found, just add the opening tag.
          tokens.push(token);
          i++;
        }
      } else {
        // Not a valid opening tag.
        tokens.push(token);
        i++;
      }
    } else {
      // Not an opening tag (could be closing tag, self-closing, or regular character).
      tokens.push(token);
      i++;
    }
  }

  return tokens;
};

/**
 * Tokenizes a string into characters and complete XML/HTML tags.
 * For example: "hello <b>world</b>!" becomes ["h", "e", "l", "l", "o", " ", "<b>", "w", "o", "r", "l", "d", "</b>", "!"]
 * If a tag fragment is encountered (no closing '>'), the entire fragment is returned as one token.
 */
export const tokenizeWithTags = (text: string): string[] => {
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
        // No closing bracket found, return the entire remaining fragment.
        tokens.push(text.slice(i));
        break;
      }
    } else {
      // Regular character.
      tokens.push(text[i]);
      i++;
    }
  }

  return tokens;
};
