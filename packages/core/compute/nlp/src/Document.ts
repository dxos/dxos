//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/** Universal POS tagset (17 tags). https://universaldependencies.org/u/pos/ */
export const Upos = Schema.Literal(
  'ADJ', 'ADP', 'ADV', 'AUX', 'CCONJ', 'DET', 'INTJ', 'NOUN', 'NUM',
  'PART', 'PRON', 'PROPN', 'PUNCT', 'SCONJ', 'SYM', 'VERB', 'X',
);
export type Upos = Schema.Schema.Type<typeof Upos>;

/** A single word/punctuation token. `start`/`end` are character offsets within the source text. */
export const Token = Schema.Struct({
  index: Schema.Number.annotations({ description: 'Position of the token within its sentence.' }),
  text: Schema.String.annotations({ description: 'Surface form exactly as it appears in the source.' }),
  upos: Upos.annotations({ description: 'Universal part-of-speech tag.' }),
  start: Schema.Number,
  end: Schema.Number,
});
export type Token = Schema.Schema.Type<typeof Token>;

export const Sentence = Schema.Struct({
  index: Schema.Number,
  start: Schema.Number,
  end: Schema.Number,
  tokens: Schema.Array(Token),
});
export type Sentence = Schema.Schema.Type<typeof Sentence>;

/** A parsed document. `sourceHash` is the divergence signal; `timestamp` is debug-only. */
export const Document = Schema.Struct({
  sourceHash: Schema.String,
  sentences: Schema.Array(Sentence),
  timestamp: Schema.optional(Schema.Number),
});
export type Document = Schema.Schema.Type<typeof Document>;

/** Raw, offset-free output of a tagger before alignment. */
export type RawSentence = { tokens: { text: string; upos: Upos }[] };
