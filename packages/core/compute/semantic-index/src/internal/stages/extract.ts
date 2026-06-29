//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { AiService, ModelName } from '@dxos/ai';

import { SemanticIndexError } from '../../errors';
import { Factuality } from '../../types';

export type ExtractDocument = {
  readonly text: string;
  readonly source: string;
  readonly author?: string;
  readonly date?: string;
};

export const DEFAULT_MODEL: ModelName = 'ai.claude.model.claude-haiku-4-5';

/** Flat LLM payload (entities are surface strings; linking happens in the pipeline). */
export const ExtractPayload = Schema.Struct({
  facts: Schema.Array(
    Schema.Struct({
      subject: Schema.String,
      predicate: Schema.String,
      object: Schema.String,
      validFrom: Schema.optional(Schema.String),
      validTo: Schema.optional(Schema.String),
      factuality: Factuality,
      polarity: Schema.Literal('+', '-', '?'),
      confidence: Schema.optional(Schema.Number),
      nature: Schema.optional(Schema.Literal('epistemic', 'aleatory')),
      quote: Schema.optional(Schema.String),
    }),
  ),
});
export interface ExtractPayload extends Schema.Schema.Type<typeof ExtractPayload> {}

const PROMPT = `You extract atomic propositions from a message as structured facts.
For each proposition output: subject, predicate (a short verb phrase), object, optional validFrom/validTo (ISO dates), a FactBank factuality value (CT+ certain-positive, PR+ probable-positive, PS+ possible-positive, and their - and CTu/Uu variants), polarity (+/-/?), optional confidence 0..1, optional nature (epistemic/aleatory), and the source quote.
Capture uncertainty in factuality (e.g. "probably" => PR+, "might" => PS+).`;

/** Run schema-constrained extraction for one chunk. */
export const extractChunk = (
  doc: ExtractDocument,
): Effect.Effect<ExtractPayload, SemanticIndexError, AiService.AiService> =>
  Effect.gen(function* () {
    const context = `Author: ${doc.author ?? 'unknown'}\nDate: ${doc.date ?? 'unknown'}\nMessage:\n${doc.text}`;
    const response = yield* LanguageModel.generateObject({ schema: ExtractPayload, prompt: `${PROMPT}\n\n${context}` });
    return response.value;
  }).pipe(
    // Model-layer construction failure is a fatal wiring fault (defect); transient LLM failures
    // (rate-limit/timeout) stay recoverable so callers can catchTag/retry.
    Effect.provide(AiService.model(DEFAULT_MODEL).pipe(Layer.orDie)),
    Effect.mapError((cause) => new SemanticIndexError({ message: 'Failed to extract facts', cause })),
  );
