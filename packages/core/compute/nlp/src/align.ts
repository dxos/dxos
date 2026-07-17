//
// Copyright 2026 DXOS.org
//

import { type Document, type RawSentence, type Sentence, type Token } from './Document';
import { sourceHash } from './hash';

/**
 * Align offset-free tagger output against the source text to compute exact character offsets.
 * A single forward cursor guarantees repeated surface forms map to successive occurrences rather
 * than re-matching the first. Tokens whose surface form cannot be located ahead of the cursor are
 * dropped (the tagger hallucinated a token), keeping offsets internally consistent.
 */
export const assembleDocument = (sourceText: string, rawSentences: readonly RawSentence[]): Document => {
  let cursor = 0;
  const sentences: Sentence[] = [];

  rawSentences.forEach((raw, sentenceIndex) => {
    const tokens: Token[] = [];
    for (const { text, upos } of raw.tokens) {
      const start = sourceText.indexOf(text, cursor);
      if (start < 0) {
        continue;
      }

      const end = start + text.length;
      tokens.push({ index: tokens.length, text, upos, start, end });
      cursor = end;
    }

    if (tokens.length > 0) {
      sentences.push({ index: sentenceIndex, start: tokens[0].start, end: tokens[tokens.length - 1].end, tokens });
    }
  });

  return {
    sourceHash: sourceHash(sourceText),
    sentences,
    timestamp: undefined,
  };
};
