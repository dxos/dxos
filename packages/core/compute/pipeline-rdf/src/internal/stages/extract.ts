//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { type AiModelNotAvailableError, AiService } from '@dxos/ai';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';

import { SemanticIndexError } from '../../errors';
import { FactualityValue } from '../../types';

export type ExtractDocument = {
  readonly text: string;
  readonly source: string;
  readonly author?: string;
  readonly date?: string;
};

export const DEFAULT_MODEL = 'com.anthropic.model.claude-haiku-4-5.default';

/** Flat LLM payload (entities are surface strings; linking happens in the pipeline). */
export const ExtractPayload = Schema.Struct({
  facts: Schema.Array(
    Schema.Struct({
      subject: Schema.String,
      predicate: Schema.String,
      object: Schema.String,
      validFrom: Schema.optional(Schema.String),
      validTo: Schema.optional(Schema.String),
      factuality: FactualityValue,
      polarity: Schema.Literal('+', '-', '?'),
      confidence: Schema.optional(Schema.Number),
      nature: Schema.optional(Schema.Literal('epistemic', 'aleatory')),
      quote: Schema.optional(Schema.String),
    }),
  ),
});
export interface ExtractPayload extends Schema.Schema.Type<typeof ExtractPayload> {}

const BASE_PROMPT = `You extract atomic propositions from a message as structured facts.
For each proposition output: subject, predicate (a short verb phrase), object, optional validFrom/validTo (ISO dates), a FactBank factuality value (CT+ certain-positive, PR+ probable-positive, PS+ possible-positive, and their - and CTu/Uu variants), polarity (+/-/?), optional confidence 0..1, optional nature (epistemic/aleatory), and the source quote.`;

/**
 * The default extraction rules, one self-contained constraint per entry. Callers extend the set via
 * {@link ExtractOptions.rules} (appended after these), so domain-specific guidance is added without
 * forking the prompt. Keep each rule atomic and example-driven so they compose cleanly.
 */
export const DEFAULT_EXTRACTION_RULES: readonly string[] = [
  'Capture uncertainty in factuality ("probably" => PR+, "might" => PS+).',
  'Keep prepositions and particles that bind to the verb in the predicate, not the object: passive voice "X was created by Y" => predicate "created by", object "Y" (just the agent). Likewise "moved to", "depends on", "reported by".',
  'Use the exact predicate "is-a" for class membership: "Socrates is a man" => subject "Socrates", predicate "is-a", object "man". Never use bare "is" or "was" as the membership predicate.',
  'Keep every predicate in timeless present form and express tense through validFrom/validTo instead: "Alice worked at Acme until 2020" => predicate "works at" with validTo set from the stated end. Past tense alone — without an explicit date or an end cue such as "until", "former", or "no longer" — does NOT set validTo.',
  'Prefer short, reusable predicates and reuse the SAME predicate for the same relation throughout ("works for" / "employed by" => pick one, e.g. "works at"). Never invent a synonym variant of a predicate you have already emitted.',
  'The object must be a single concrete entity (a person, project, org, place, or thing) or a literal value — never a raw id, snowflake, URL, or channel reference. Drop the proposition if the only object would be such an opaque token.',
  'Emit a proposition only when BOTH its subject and object are concrete and named. If either would be an unresolved pronoun (we/it/they/this/that) or otherwise unknown, omit the proposition entirely — never output "unknown" as a subject or object.',
  'Do not extract facts from questions or requests: an interrogative or tag question ("… right?", "does X have Y?", "should we …?") asks for information and asserts nothing. Skip it unless the author also states a proposition they commit to.',
];

export type ExtractOptions = {
  /** Extra extraction rules appended after {@link DEFAULT_EXTRACTION_RULES}. */
  readonly rules?: readonly string[];
  /** Model DXN to extract with. Defaults to {@link DEFAULT_MODEL}. */
  readonly model?: string;
  /** Provider DXN for model resolution (e.g. `Provider.ollama.id`) when the model is not served by the default provider. */
  readonly provider?: string;
};

/** Compose the system prompt from the base instruction and the (default + caller) rules. */
export const buildExtractionPrompt = (options?: ExtractOptions): string => {
  const rules = [...DEFAULT_EXTRACTION_RULES, ...(options?.rules ?? [])];
  return `${BASE_PROMPT}\nRules:\n${rules.map((rule, index) => `${index + 1}. ${rule}`).join('\n')}`;
};

/** Run schema-constrained extraction for one chunk. */
export const extractChunk = (
  doc: ExtractDocument,
  options?: ExtractOptions,
): Effect.Effect<ExtractPayload, SemanticIndexError, AiService.AiService> =>
  Effect.gen(function* () {
    const context = `Author: ${doc.author ?? 'unknown'}\nDate: ${doc.date ?? 'unknown'}\nMessage:\n${doc.text}`;
    const response = yield* LanguageModel.generateObject({
      schema: ExtractPayload,
      prompt: `${buildExtractionPrompt(options)}\n\n${context}`,
    });
    return response.value;
  }).pipe(
    Effect.provide(modelLayer(options).pipe(Layer.orDie)),
    // Model-layer construction failure is a fatal wiring fault (defect); transient LLM failures
    // (rate-limit/timeout) stay recoverable so callers can catchTag/retry.
    Effect.mapError((cause) => new SemanticIndexError({ message: 'Failed to extract facts', cause })),
  );

/** Resolve the `LanguageModel` layer for extraction, honoring a caller-supplied model/provider override. */
const modelLayer = (
  options?: ExtractOptions,
): Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, AiService.AiService> => {
  if (!options?.provider) {
    return AiService.model(options?.model ?? DEFAULT_MODEL);
  }
  const provider = DXN.tryMake(options.provider);
  invariant(provider, `Invalid provider DXN: ${options.provider}`);
  return AiService.model(options.model ?? DEFAULT_MODEL, { provider });
};
