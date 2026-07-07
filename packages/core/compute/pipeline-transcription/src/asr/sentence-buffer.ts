//
// Copyright 2026 DXOS.org
//

import { type ContentBlock } from '@dxos/types';

/**
 * Splits text into complete sentences plus a trailing incomplete remainder.
 *
 * A run of `.`/`!`/`?` followed by whitespace or end-of-string terminates a sentence; an ellipsis
 * (`..`+) is treated as non-terminal so mid-thought pauses keep accumulating. Abbreviations are not
 * special-cased — this is a deterministic heuristic, not a full sentence tokenizer.
 */
export const splitSentences = (text: string): { sentences: string[]; rest: string } => {
  const sentences: string[] = [];
  let start = 0;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char !== '.' && char !== '!' && char !== '?') {
      continue;
    }
    // Collapse a run of terminators (e.g. "?!" or "...").
    let end = index;
    while (end + 1 < text.length && (text[end + 1] === '.' || text[end + 1] === '!' || text[end + 1] === '?')) {
      end++;
    }
    const isEllipsis = text.slice(index, end + 1).startsWith('..');
    const next = text[end + 1];
    const atBoundary = next === undefined || /\s/.test(next);
    if (!isEllipsis && atBoundary) {
      const sentence = text.slice(start, end + 1).trim();
      if (sentence.length > 0) {
        sentences.push(sentence);
      }
      start = end + 1;
    }
    index = end;
  }
  return { sentences, rest: text.slice(start).trim() };
};

/**
 * Accumulates ASR fragments (which cut mid-sentence at chunk boundaries) and re-emits complete,
 * sentence-aligned transcript blocks. Each emitted block inherits the `started` timestamp of the
 * fragment that began the sentence. `flush` emits whatever remains (e.g. on stop).
 */
export class SentenceBuffer {
  #text = '';
  #started?: string;

  /** Append a fragment; returns any complete sentences it produced. */
  push(block: ContentBlock.Transcript): ContentBlock.Transcript[] {
    const fragment = block.text.trim();
    if (fragment.length === 0) {
      return [];
    }
    if (this.#text.length === 0) {
      this.#started = block.started;
    }
    this.#text = this.#text.length === 0 ? fragment : `${this.#text} ${fragment}`;

    const { sentences, rest } = splitSentences(this.#text);
    if (sentences.length === 0) {
      return [];
    }
    const startedForSentences = this.#started;
    this.#text = rest;
    // The remainder starts a new sentence whose timestamp we don't know yet; cleared until the next push.
    this.#started = rest.length > 0 ? this.#started : undefined;
    return sentences.map((text, index) => ({
      _tag: 'transcript' as const,
      started: index === 0 ? (startedForSentences ?? block.started) : block.started,
      text,
    }));
  }

  /** Emit any buffered text as a final sentence. */
  flush(): ContentBlock.Transcript[] {
    const remaining = this.#text.trim();
    this.#text = '';
    const started = this.#started;
    this.#started = undefined;
    if (remaining.length === 0) {
      return [];
    }
    return [{ _tag: 'transcript', started: started ?? new Date(0).toISOString(), text: remaining }];
  }
}
