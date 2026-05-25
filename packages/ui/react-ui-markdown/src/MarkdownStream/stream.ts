//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { Obj } from '@dxos/echo';

export const renderObjectLink = (obj: Obj.Unknown, block?: boolean) =>
  `${block ? '!' : ''}[${Obj.getLabel(obj)}](${Obj.getDXN(obj).toString()})`;

export type StreamerOptions = {
  /**
   * How to subdivide plain-text spans before emitting them downstream.
   *  - `'span'` (default) — keep entire spans intact; one CM dispatch per chunk that arrived at the source.
   *  - `'word'` — split text spans at whitespace boundaries (whitespace runs become their own tokens).
   *  - `'character'` — split text spans into individual characters.
   * XML/HTML fragments (`<tag>…</tag>`, self-closing tags, hyphenated custom elements) are always
   * emitted as one token regardless of `chunkSize`, otherwise widget mounting would see partial markup.
   */
  chunkSize?: 'character' | 'word' | 'span';
  /**
   * Inter-token delay in ms. Default `0`. Useful for slowing down rapid bursts so the
   * downstream renderer (CodeMirror) can show a visible streaming cadence even when the
   * source emits large chunks at once.
   */
  delayMs?: number;
};

/**
 * Streams tokens to the consumer, keeping XML/HTML fragments intact.
 *
 * The cadence is controlled by `options.chunkSize`. `'span'` (default) preserves the
 * one-token-per-source-chunk behaviour the function had originally. Use `'word'` or
 * `'character'` to decouple the visible cadence from the source's chunk size — useful when
 * the AI service emits large partial blocks but you want a smoother typewriter effect.
 */
export const createStreamer = (
  source: Stream.Stream<string>,
  { chunkSize = 'span', delayMs = 0 }: StreamerOptions = {},
) => {
  const subdivide =
    chunkSize === 'span'
      ? (token: string) => [token]
      : (token: string) => (isXmlFragment(token) ? [token] : splitTextSpan(token, chunkSize));

  let stream: Stream.Stream<string> = source.pipe(
    Stream.flatMap((chunk) => Stream.fromIterable(splitFragments(chunk).flatMap(subdivide))),
  );
  if (delayMs > 0) {
    stream = stream.pipe(Stream.tap(() => Effect.sleep(`${delayMs} millis`)));
  }
  return stream;
};

/** A token starts with `<` if and only if it is an XML/HTML fragment produced by `splitFragments`. */
const isXmlFragment = (token: string): boolean => token.startsWith('<');

/**
 * Subdivide a non-XML text span into smaller tokens. `'word'` splits into runs of non-whitespace
 * and runs of whitespace as separate tokens (so the renderer can display whitespace cadence too).
 */
const splitTextSpan = (span: string, chunkSize: 'character' | 'word'): string[] => {
  if (chunkSize === 'character') {
    return [...span];
  }
  return span.match(/\s+|\S+/g) ?? [span];
};

/** Matches opening tag names, including custom elements with hyphens (e.g. dom-widget). */
const OPENING_TAG_NAME = /^<([a-zA-Z][\w-]*)(?:\s[^>]*)?>/;

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
      const tagMatch = token.match(OPENING_TAG_NAME);
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
