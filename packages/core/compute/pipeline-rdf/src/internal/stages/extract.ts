//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { type AiModelNotAvailableError, AiService } from '@dxos/ai';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';

import { SemanticIndexError } from '../../errors';
import { Factuality } from '../../types';

export type ExtractDocument = {
  readonly text: string;
  readonly source: string;
  readonly author?: string;
  readonly date?: string;
};

export const DEFAULT_MODEL = 'com.anthropic.model.claude-haiku-4-5.default';

// Optional enrichment field: models routinely emit `null` (not omission) for "not present", so
// accept null as absent. A plain `Schema.optional(String)` rejects null and would discard the whole
// fact over an empty date/quote.
const OptionalString = Schema.optionalWith(Schema.String, { nullable: true });

// Soft enum: keep the known values, coerce anything else (a model's stray value like "Person", or a
// null) to absent. A bad enrichment value must not discard an otherwise-valid fact.
const Nature = Schema.optional(
  Schema.transform(Schema.Unknown, Schema.UndefinedOr(Schema.Literal('epistemic', 'aleatory')), {
    strict: false,
    decode: (value) => (value === 'epistemic' || value === 'aleatory' ? value : undefined),
    encode: (value) => value,
  }),
);

/**
 * One extracted fact as the model emits it (entities are surface strings; linking happens later).
 * Only subject/predicate/object/factuality/polarity are required; enrichment fields tolerate the
 * `null`s and stray enum values local models commonly produce so a single bad field never drops the
 * whole fact.
 */
export const ExtractedFact = Schema.Struct({
  subject: Schema.String,
  predicate: Schema.String,
  object: Schema.String,
  validFrom: OptionalString,
  validTo: OptionalString,
  factuality: Factuality,
  polarity: Schema.Literal('+', '-', '?'),
  confidence: Schema.optionalWith(Schema.Number, { nullable: true }),
  nature: Nature,
  quote: OptionalString,
});

/** Flat LLM payload (entities are surface strings; linking happens in the pipeline). */
export const ExtractPayload = Schema.Struct({
  facts: Schema.Array(ExtractedFact),
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

const decodeFact = Schema.decodeUnknownOption(ExtractedFact);

// Top-level balanced `{...}` spans, in order. Brace-only (does not skip braces inside string
// literals) — a best-effort tokenizer for salvage, not a JSON validator.
const jsonObjectSpans = (raw: string): string[] => {
  const spans: string[] = [];
  let depth = 0;
  let start = -1;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (char === '{') {
      if (depth === 0) {
        start = index;
      }
      depth += 1;
    } else if (char === '}' && depth > 0) {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        spans.push(raw.slice(start, index + 1));
        start = -1;
      }
    }
  }
  return spans;
};

/**
 * Salvage an {@link ExtractPayload} from free model text. Local/reasoning models (e.g. gpt-oss via
 * Ollama) wrap the JSON in prose that can itself contain braces (examples, code fences), so scan
 * every top-level object and use the first one carrying a `facts` array — a greedy first-`{`-to-last-
 * `}` match would span across stray braces and fail to parse. Entries that don't decode against
 * {@link ExtractedFact} are dropped rather than failing the whole document.
 */
export const parseExtractPayload = (raw: string): ExtractPayload => {
  for (const span of jsonObjectSpans(raw)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(span);
    } catch {
      continue;
    }
    if (typeof parsed !== 'object' || parsed === null) {
      continue;
    }
    const factsValue = Reflect.get(parsed, 'facts');
    if (!Array.isArray(factsValue)) {
      continue;
    }
    return {
      facts: factsValue.flatMap((entry) =>
        Option.match(decodeFact(entry), { onNone: () => [], onSome: (fact) => [fact] }),
      ),
    };
  }
  return { facts: [] };
};

/**
 * Extract facts for one chunk. Strict `generateObject` first (strong models honor the schema), then
 * a lenient `generateText` + JSON-salvage fallback so schema-non-conforming models still yield facts
 * instead of degrading the document to none. Both attempts are timed and logged: a model that always
 * fails the strict pass pays for two full generations per chunk, and the `strictMs`/`lenientMs`
 * breakdown makes that cost visible (the dominant per-message latency in the email pipeline).
 */
export const extractChunk = (
  doc: ExtractDocument,
  options?: ExtractOptions,
): Effect.Effect<ExtractPayload, SemanticIndexError, AiService.AiService> =>
  Effect.gen(function* () {
    const context = `Author: ${doc.author ?? 'unknown'}\nDate: ${doc.date ?? 'unknown'}\nMessage:\n${doc.text}`;
    const prompt = `${buildExtractionPrompt(options)}\n\n${context}`;
    const [strictDuration, strict] = yield* Effect.timed(
      LanguageModel.generateObject({ schema: ExtractPayload, prompt }).pipe(
        Effect.map((response) => Option.some(response.value)),
        Effect.catchAll(() => Effect.succeed(Option.none<ExtractPayload>())),
      ),
    );
    const strictMs = Math.round(Duration.toMillis(strictDuration));
    if (Option.isSome(strict)) {
      log('extract-facts: strict', { source: doc.source, strictMs, facts: strict.value.facts.length });
      return strict.value;
    }
    const [lenientDuration, payload] = yield* Effect.timed(
      LanguageModel.generateText({
        prompt: `${prompt}\n\nRespond with ONLY a JSON object of the form {"facts": [ ... ]} — no prose, no markdown fences.`,
      }).pipe(Effect.map((response) => parseExtractPayload(response.text))),
    );
    // Strict validation failed and its whole generation was wasted; the lenient retry doubles latency.
    log.warn('extract-facts: strict rejected, used lenient fallback', {
      source: doc.source,
      strictMs,
      lenientMs: Math.round(Duration.toMillis(lenientDuration)),
      facts: payload.facts.length,
    });
    return payload;
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
