//
// Copyright 2025 DXOS.org
//

import * as Stream from 'effect/Stream';

import { Obj } from '@dxos/echo';

export const renderObjectLink = (obj: Obj.Any, block?: boolean) =>
  `${block ? '!' : ''}[${Obj.getLabel(obj)}](${Obj.getDXN(obj).toString()})`;

/**
 * Streams text character by character with a delay, but keeps XML/HTML tags intact.
 */
export const createStreamer = (source: Stream.Stream<string>) =>
  source.pipe(
    Stream.flatMap((chunk) =>
      Stream.fromIterable(splitFragments(chunk)).pipe(Stream.flatMap((token) => Stream.succeed(token))),
    ),
  );

/**
 * Splits text into chunks, preserving XML/HTML fragments.
 */
export const splitFragments = (text: string): string[] => {
  // First tokenize with tags to get tags as complete tokens.
  const initialTokens = splitSpans(text);
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
        let foundClosing = false;
        let j = i + 1;
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

// TODO(burdon): Split into paragraphs and tags.
// export const tokenizeWithTags = (text: string): string[] => {
//   const tokens: string[] = [];
//   let i = 0;
//   while (i < text.length) {
//     if (text[i] === '<') {
//       // Find the closing bracket.
//       const closeIndex = text.indexOf('>', i);
//       if (closeIndex !== -1) {
//         // Include the complete tag.
//         tokens.push(text.slice(i, closeIndex + 1));
//         i = closeIndex + 1;
//       } else {
//         // No closing bracket found, return the entire remaining fragment.
//         tokens.push(text.slice(i));
//         break;
//       }
//     } else {
//       // Regular character.
//       tokens.push(text[i]);
//       i++;
//     }
//   }
//   return tokens;
// };

export const splitSpans = (text: string): string[] => {
  const spans: string[] = [];
  let currentText = '';

  let i = 0;
  while (i < text.length) {
    if (text[i] === '<') {
      // If we have accumulated text, split it into sentences and push them.
      if (currentText) {
        // const sentences = splitSentences(currentText);
        // spans.push(...sentences);
        spans.push(currentText);
        currentText = '';
      }

      // Find the closing bracket.
      const closeIndex = text.indexOf('>', i);
      if (closeIndex !== -1) {
        // Include the complete tag.
        spans.push(text.slice(i, closeIndex + 1));
        i = closeIndex + 1;
      } else {
        // No closing bracket found, treat the rest as text.
        currentText = text.slice(i);
        break;
      }
    } else {
      // Accumulate regular text.
      currentText += text[i];
      i++;
    }
  }

  // Push any remaining text split into sentences.
  if (currentText) {
    spans.push(currentText);
    // const sentences = splitSentences(currentText);
    // spans.push(...sentences);
  }

  return spans;
};

/**
 * Split text into sentences, preserving the sentence-ending punctuation.
 */
export const splitSentences = (text: string): string[] => {
  // Match sentences ending with ., !, or ? followed by space or end of string.
  // This regex captures the sentence including its ending punctuation.
  const sentenceRegex = /[^.!?]*[.!?]+(?:\s+|$)/g;
  const sentences: string[] = [];
  let lastIndex = 0;
  let match;

  while ((match = sentenceRegex.exec(text)) !== null) {
    sentences.push(match[0]);
    lastIndex = match.index + match[0].length;
  }

  // If there's remaining text that doesn't end with punctuation, include it.
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex);
    if (remaining) {
      sentences.push(remaining);
    }
  }

  // If no sentences were found, return the original text.
  if (sentences.length === 0 && text) {
    sentences.push(text);
  }

  return sentences;
};
