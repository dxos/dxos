//
// Copyright 2026 DXOS.org
//

import { assembleDocument } from './align';
import { type Document, type RawSentence, type Upos } from './Document';

// Closed-class lexicon: small, deterministic, language-is-English assumption
// (the stub is a demo fallback, not the production tagger). Lowercased keys.
const LEXICON: Record<string, Upos> = {
  the: 'DET',
  a: 'DET',
  an: 'DET',
  this: 'DET',
  that: 'DET',
  these: 'DET',
  those: 'DET',
  i: 'PRON',
  you: 'PRON',
  he: 'PRON',
  she: 'PRON',
  it: 'PRON',
  we: 'PRON',
  they: 'PRON',
  is: 'AUX',
  am: 'AUX',
  are: 'AUX',
  was: 'AUX',
  were: 'AUX',
  be: 'AUX',
  been: 'AUX',
  do: 'AUX',
  did: 'AUX',
  in: 'ADP',
  on: 'ADP',
  at: 'ADP',
  of: 'ADP',
  to: 'ADP',
  over: 'ADP',
  under: 'ADP',
  with: 'ADP',
  for: 'ADP',
  and: 'CCONJ',
  or: 'CCONJ',
  but: 'CCONJ',
  because: 'SCONJ',
  if: 'SCONJ',
  while: 'SCONJ',
  although: 'SCONJ',
  not: 'PART',
  very: 'ADV',
  quickly: 'ADV',
  well: 'ADV',
  oh: 'INTJ',
  yes: 'INTJ',
  no: 'INTJ',
};

const WORD_RE = /[A-Za-z]+(?:'[A-Za-z]+)?|[0-9]+|[.!?,;:]/g;

/**
 * Fake tags one token by lexicon → number → suffix heuristic → capitalization. `initial` = sentence start.
 */
const tagWord = (raw: string, initial: boolean): Upos => {
  if (/^[.!?,;:]$/.test(raw)) {
    return 'PUNCT';
  }
  if (/^[0-9]+$/.test(raw)) {
    return 'NUM';
  }
  const lower = raw.toLowerCase();
  if (LEXICON[lower]) {
    return LEXICON[lower];
  }
  if (/^[A-Z]/.test(raw) && !initial) {
    return 'PROPN';
  }
  if (/(ing|ed|ize|ise)$/.test(lower)) {
    return 'VERB';
  }
  if (/(ly)$/.test(lower)) {
    return 'ADV';
  }
  if (/(ous|ful|ive|able|al)$/.test(lower)) {
    return 'ADJ';
  }
  return 'NOUN';
};

/** Deterministic UPOS tagger: splits on sentence-final punctuation, tags each token. */
export const stubTag = (text: string): RawSentence[] => {
  const sentences: RawSentence[] = [];
  let tokens: { text: string; upos: Upos }[] = [];
  let initial = true;
  for (const match of text.matchAll(WORD_RE)) {
    const raw = match[0];
    tokens.push({ text: raw, upos: tagWord(raw, initial) });
    initial = false;
    if (/^[.!?]$/.test(raw)) {
      sentences.push({ tokens });
      tokens = [];
      initial = true;
    }
  }

  if (tokens.length > 0) {
    sentences.push({ tokens });
  }

  return sentences;
};

/** Parser-shaped wrapper around the stub tagger (async to match the `Parser` contract). */
export const stubParse = async (text: string): Promise<Document> => assembleDocument(text, stubTag(text));
