//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { DXN } from '@dxos/keys';

import { assembleDocument } from './align';
import { type Document, Upos } from './Document';
import { stubParse } from './stub';

const PARSE_MODEL: DXN.DXN = DXN.make('com.anthropic.model.claudeHaiku45');

/** LLM output schema: sentences → tokens, no offsets (alignment computes those). */
const TaggedSentences = Schema.Struct({
  sentences: Schema.Array(
    Schema.Struct({
      tokens: Schema.Array(
        Schema.Struct({
          text: Schema.String.annotations({ description: 'Token surface form exactly as in the source.' }),
          upos: Upos.annotations({ description: 'Universal POS tag for the token.' }),
        }),
      ),
    }),
  ),
});

/**
 * Tag `text` with UPOS via a small LLM, then deterministically align tokens to source offsets.
 * Provides the LanguageModel internally; residual requirement is {@link AiService.AiService}.
 */
export const parseText = (text: string) =>
  Effect.gen(function* () {
    const { value } = yield* Effect.scoped(
      LanguageModel.generateObject({
        schema: TaggedSentences,
        prompt: [
          'Tokenize the text below into sentences and tokens, and tag each token with its',
          'Universal POS tag (UPOS): ADJ ADP ADV AUX CCONJ DET INTJ NOUN NUM PART PRON PROPN',
          'PUNCT SCONJ SYM VERB X. Return each token surface form exactly as it appears, in order,',
          'including punctuation as its own PUNCT token. Do not add or omit tokens.',
          '',
          'Text:',
          text,
        ].join('\n'),
      }),
    );
    return assembleDocument(text, value.sentences);
  }).pipe(Effect.provide(AiService.model(PARSE_MODEL)));

/** The pluggable parser contract consumed by the editor extension and pipeline. */
export type Parser = (text: string) => Promise<Document>;

export { stubParse };
