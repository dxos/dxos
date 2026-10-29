//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from 'effect/ai/LanguageModel';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as SchemaTransformation from 'effect/SchemaTransformation';

import { type AiModelNotAvailableError, AiService } from '@dxos/ai';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';

import { SemanticIndexError } from '../../errors.ts';
import {
  type ExtractDocument,
  type ExtractOptions,
  FactualityValue,
  type KnownEntity,
  Ontology,
} from '../../types/index.ts';

export const DEFAULT_MODEL = 'com.anthropic.model.claude-haiku-4-5.default';

// Optional enrichment field: models routinely emit `null` (not omission) for "not present", so
// accept null as absent. A plain `Schema.optional(String)` rejects null and would discard the whole
// fact over an empty date/quote.
// v4 split `optionalWith`: the `{ nullable: true }` behaviour (decode `null` as absent) is an
// explicit transformation now.
const nullableAsAbsent = <A>(schema: Schema.Codec<A, A>) =>
  Schema.optional(
    Schema.NullOr(schema).pipe(
      Schema.decodeTo(
        Schema.UndefinedOr(schema),
        SchemaTransformation.transform<A | undefined, A | null>({
          decode: (value) => value ?? undefined,
          encode: (value) => value ?? null,
        }),
      ),
    ),
  );

const OptionalString = nullableAsAbsent(Schema.String);

// Soft enum: keep the known values, coerce anything else (a model's stray value like "Person", or a
// null) to absent. A bad enrichment value must not discard an otherwise-valid fact. The wire side is a
// nullable string, not `Unknown`: Anthropic's structured output rejects a property schema with no type.
const softEnum = <const A extends string>(...values: readonly A[]) =>
  Schema.optional(
    Schema.NullOr(Schema.String).pipe(
      Schema.decodeTo(
        Schema.UndefinedOr(Schema.Literals(values)),
        SchemaTransformation.transform({
          decode: (value) => values.find((known) => known === value),
          encode: (value) => value ?? null,
        }),
      ),
    ),
  );

const Nature = softEnum('epistemic', 'aleatory');
const Kind = softEnum('person', 'org', 'place', 'event', 'concept', 'thing');
// Illocutionary force + sentence mood - the speech act the author performs (see pipeline-rdf
// `Illocution`). Soft enums so a stray value never discards the fact; default (absent) is assertive.
const Force = softEnum('assertive', 'directive', 'commissive', 'expressive');
const Mood = softEnum('declarative', 'interrogative', 'imperative');

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
  factuality: FactualityValue,
  polarity: Schema.Literals(['+', '-', '?']),
  confidence: nullableAsAbsent(Schema.Number),
  nature: Nature,
  force: Force,
  mood: Mood,
  quote: OptionalString,
  subjectType: Kind,
  objectType: Kind,
  /** A short name for the group of statements this one belongs to. */
  graph: OptionalString,
  /** For a predicate not in the listed vocabulary only: one sentence defining what it relates. */
  predicateDescription: OptionalString,
});
export interface ExtractedFact extends Schema.Schema.Type<typeof ExtractedFact> {}

/** Flat LLM payload (entities are surface strings; linking happens in the pipeline). */
export const ExtractPayload = Schema.Struct({
  facts: Schema.Array(ExtractedFact),
});
export interface ExtractPayload extends Schema.Schema.Type<typeof ExtractPayload> {}

/**
 * One fact extracted from a transcript of several messages: an {@link ExtractedFact} that also cites the tag of the
 * message stating it. A separate schema, so single-document requests stay byte-identical to what they were.
 */
export const TranscriptFact = Schema.Struct({
  ...ExtractedFact.fields,
  /** The tag of the transcript message the proposition comes from (e.g. `m3`). */
  message: OptionalString,
});
export interface TranscriptFact extends Schema.Schema.Type<typeof TranscriptFact> {}

/** LLM payload for a transcript: facts that each cite their message. */
export const TranscriptPayload = Schema.Struct({
  facts: Schema.Array(TranscriptFact),
});
export interface TranscriptPayload extends Schema.Schema.Type<typeof TranscriptPayload> {}

const BASE_PROMPT = `You extract atomic propositions from a message as structured facts.
For each proposition output: subject, predicate (a listed predicate's shorthand, or a new short verb phrase), object, optional validFrom/validTo (ISO dates), a FactBank factuality value (CT+ certain-positive, PR+ probable-positive, PS+ possible-positive, and their - and CTu/Uu variants), polarity (+/-/?), optional confidence 0..1, optional nature (epistemic/aleatory), the speech act as force (assertive|directive|commissive|expressive) and mood (declarative|interrogative|imperative), the source quote, optional subjectType/objectType (person|org|place|event|concept|thing), graph (a short name for the group of propositions it belongs to), and predicateDescription (only for a new predicate).`;

/**
 * The ontology's predicates as a prompt section, one per line with its shorthand, label, synonyms, description and
 * typing, so the extractor reuses them rather than inventing variants. Deprecated (merged-away) predicates are left
 * out: their replacement is listed with their surface forms.
 */
export const predicateSection = (ontology: Ontology.Ontology): string => {
  const lines = ontology.entries
    .filter((entry) => entry.replacedBy === undefined)
    .map((entry) => {
      const synonyms = entry.synonyms?.length ? ` (also: ${entry.synonyms.join(', ')})` : '';
      const typing = [entry.domain, entry.range].some(Boolean)
        ? ` [${Ontology.labelFromIri(entry.domain ?? 'any')} -> ${Ontology.labelFromIri(entry.range ?? 'any')}]`
        : '';
      return `- ${entry.name}: "${entry.label}"${synonyms}${typing}${entry.description ? ` - ${entry.description}` : ''}`;
    });
  return [
    'Predicates. Use the shorthand of the one that fits the relation (or any of its forms). Only when none fits, write a new short verb phrase in timeless present form and set predicateDescription to one sentence saying what it relates:',
    ...lines,
  ].join('\n');
};

/** The known entities as a prompt section, so a mention of one is spelled the way it resolves. */
export const entitySection = (entities: ReadonlyArray<KnownEntity>): string =>
  [
    'Known entities. When a subject or object refers to one of these, spell it exactly as listed:',
    ...entities.map(
      (entity) =>
        `- ${entity.label}${entity.type ? ` (${entity.type})` : ''}${entity.aliases?.length ? ` - also: ${entity.aliases.join(', ')}` : ''}`,
    ),
  ].join('\n');

/**
 * The default extraction rules, one self-contained constraint per entry. Callers extend the set via
 * {@link ExtractOptions.rules} (appended after these), so domain-specific guidance is added without
 * forking the prompt. Keep each rule atomic and example-driven so they compose cleanly.
 */
export const DEFAULT_EXTRACTION_RULES: readonly string[] = [
  'Capture uncertainty in factuality ("probably" => PR+, "might" => PS+).',
  'Keep prepositions and particles that bind to the verb in the predicate, not the object: passive voice "X was created by Y" => predicate "created by", object "Y" (just the agent). Likewise "moved to", "depends on", "reported by".',
  'Use the predicate "is_a" for class membership: "Socrates is a man" => subject "Socrates", predicate "is_a", object "man". A job title or role is "has_role" instead: "Rich is the founder" => subject "Rich", predicate "has_role", object "founder". Never use bare "is" or "was".',
  'Give propositions from the same sentence the same graph name, and propositions from another sentence a different one.',
  'Keep every predicate in timeless present form and express tense through validFrom/validTo instead: "Alice worked at Acme until 2020" => predicate "works at" with validTo set from the stated end. Past tense alone - without an explicit date or an end cue such as "until", "former", or "no longer" - does NOT set validTo.',
  'Prefer short, reusable predicates and reuse the SAME predicate for the same relation throughout ("works for" / "employed by" => the listed "works_for"). Never invent a synonym variant of a listed predicate or of one you have already emitted.',
  'The object must be a single concrete entity (a person, project, org, place, or thing) or a literal value - never a raw id, snowflake, URL, or channel reference. Drop the proposition if the only object would be such an opaque token.',
  'Emit a proposition only when BOTH its subject and object are concrete and named. If either would be an unresolved pronoun (we/it/they/this/that) or otherwise unknown, omit the proposition entirely - never output "unknown" as a subject or object.',
  'Classify each proposition by speech act. A statement the author commits to => force "assertive", mood "declarative" (this is the default - omit force to mean assertive). A request that the recipient do something => force "directive", mood "imperative", factuality "Uu": subject = who is asked to act, predicate = the requested action, object = the thing. A question the author asks => force "directive", mood "interrogative", factuality "Uu": the proposition being asked about. The author\'s own promise/offer => force "commissive". Requests and questions are still subject to the previous rule: emit them ONLY when both subject and object are concrete and named.',
];

/**
 * The rule a transcript request adds after the caller's: read the messages as one conversation, but attribute each
 * proposition to the one message that states it, so its provenance survives batching.
 */
export const TRANSCRIPT_RULE =
  'The input is a transcript of several messages, each wrapped in <message tag="..." author="..." date="...">. Read them as one conversation, so a reply, pronoun or "that" in one message resolves against the others, but emit each proposition once, from the message that states it: set "message" to that message\'s tag (e.g. "m3"), take the quote from that message, and treat its author as the speaker.';

/**
 * Compose the system prompt from the base instruction, the (default + caller) rules, the vocabulary of predicates and
 * the known entities.
 */
export const buildExtractionPrompt = (options?: ExtractOptions): string => {
  const rules = [...DEFAULT_EXTRACTION_RULES, ...(options?.rules ?? [])];
  return [
    `${BASE_PROMPT}\nRules:\n${rules.map((rule, index) => `${index + 1}. ${rule}`).join('\n')}`,
    predicateSection(options?.ontology ?? Ontology.DEFAULT),
    ...(options?.entities?.length ? [entitySection(options.entities)] : []),
  ].join('\n\n');
};

const decodeFact = Schema.decodeUnknownOption(ExtractedFact);
const decodeTranscriptFact = Schema.decodeUnknownOption(TranscriptFact);

// Top-level balanced `{...}` spans, in order. Brace-only (does not skip braces inside string
// literals) - a best-effort tokenizer for salvage, not a JSON validator.
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
 * every top-level object and use the first one carrying a `facts` array - a greedy first-`{`-to-last-
 * `}` match would span across stray braces and fail to parse. Entries that don't decode against
 * {@link ExtractedFact} are dropped rather than failing the whole document.
 */
export const parseExtractPayload = (raw: string): ExtractPayload => ({ facts: salvageFacts(raw, decodeFact) });

/** {@link parseExtractPayload} for a transcript request, keeping each fact's message tag. */
export const parseTranscriptPayload = (raw: string): TranscriptPayload => ({
  facts: salvageFacts(raw, decodeTranscriptFact),
});

/** A span that parses as JSON with a `facts` array; its entries stay unknown so each one is decoded on its own. */
const decodeFactsSpan = Schema.decodeUnknownOption(
  Schema.fromJsonString(Schema.Struct({ facts: Schema.Array(Schema.Unknown) })),
);

const salvageFacts = <F>(raw: string, decode: (entry: unknown) => Option.Option<F>): F[] => {
  for (const span of jsonObjectSpans(raw)) {
    const payload = decodeFactsSpan(span);
    if (Option.isSome(payload)) {
      return payload.value.facts.flatMap((entry) =>
        Option.match(decode(entry), { onNone: () => [], onSome: (fact) => [fact] }),
      );
    }
  }
  return [];
};

/**
 * Extract facts for one chunk. Optionally attempts strict `generateObject` first (strong hosted
 * models honor the schema), then falls back to a lenient `generateText` + JSON-salvage path so
 * schema-non-conforming models still yield facts instead of degrading the document to none. For a
 * provider override (Ollama) the strict pass reliably fails and is skipped by default - see
 * {@link ExtractOptions.strict} - so each chunk makes a single generation. Attempts are timed and
 * logged so the strict/lenient latency split stays visible.
 */
export const extractChunk = (
  doc: ExtractDocument,
  options?: ExtractOptions,
): Effect.Effect<ExtractPayload, SemanticIndexError, AiService.AiService> => {
  const context = `Author: ${doc.author ?? 'unknown'}\nDate: ${doc.date ?? 'unknown'}\nMessage:\n${doc.text}`;
  const prompt = `${buildExtractionPrompt(options)}\n\n${context}`;
  return generatePayload({
    source: doc.source,
    strict: LanguageModel.generateObject({ schema: ExtractPayload, prompt }).pipe(
      Effect.map((response) => response.value),
    ),
    lenient: LanguageModel.generateText({ prompt: `${prompt}\n\n${LENIENT_SUFFIX}` }).pipe(
      Effect.map((response) => parseExtractPayload(response.text)),
    ),
    options,
  });
};

/**
 * {@link extractChunk} over a transcript of several tagged messages (see {@link TRANSCRIPT_RULE}): one generation
 * covers every message in it, and each fact cites the tag of the message it comes from.
 */
export const extractTranscript = (
  transcript: string,
  label: string,
  options?: ExtractOptions,
): Effect.Effect<TranscriptPayload, SemanticIndexError, AiService.AiService> => {
  const rules = [...(options?.rules ?? []), TRANSCRIPT_RULE];
  const prompt = `${buildExtractionPrompt({ ...options, rules })}\n\n${transcript}`;
  return generatePayload({
    source: label,
    strict: LanguageModel.generateObject({ schema: TranscriptPayload, prompt }).pipe(
      Effect.map((response) => response.value),
    ),
    lenient: LanguageModel.generateText({ prompt: `${prompt}\n\n${LENIENT_SUFFIX}` }).pipe(
      Effect.map((response) => parseTranscriptPayload(response.text)),
    ),
    options,
  });
};

const LENIENT_SUFFIX = 'Respond with ONLY a JSON object of the form {"facts": [ ... ]} - no prose, no markdown fences.';

/** The strict-then-lenient generation both request shapes share; `source` labels its logs. */
const generatePayload = <P extends { readonly facts: ReadonlyArray<unknown> }, StrictError, LenientError>({
  source,
  strict: strictAttempt,
  lenient: lenientAttempt,
  options,
}: {
  readonly source: string;
  readonly strict: Effect.Effect<P, StrictError, LanguageModel.LanguageModel>;
  readonly lenient: Effect.Effect<P, LenientError, LanguageModel.LanguageModel>;
  readonly options?: ExtractOptions;
}): Effect.Effect<P, SemanticIndexError, AiService.AiService> =>
  Effect.gen(function* () {
    const lenient = Effect.timed(lenientAttempt);

    // Strong hosted models honor the schema; local providers (Ollama) reliably fail structured
    // output, so callers targeting them pass `strict: false` to skip the wasted strict pass.
    const useStrict = options?.strict ?? true;
    if (!useStrict) {
      const [lenientDuration, payload] = yield* lenient;
      log('extract-facts: lenient', {
        source,
        lenientMs: Math.round(Duration.toMillis(lenientDuration)),
        facts: payload.facts.length,
      });
      return payload;
    }

    const [strictDuration, strict] = yield* Effect.timed(
      strictAttempt.pipe(
        Effect.map((value) => Option.some(value)),
        Effect.catch(() => Effect.succeed(Option.none<P>())),
      ),
    );
    const strictMs = Math.round(Duration.toMillis(strictDuration));
    if (Option.isSome(strict)) {
      log('extract-facts: strict', { source, strictMs, facts: strict.value.facts.length });
      return strict.value;
    }
    const [lenientDuration, payload] = yield* lenient;
    // Strict validation failed and its whole generation was wasted; the lenient retry doubles latency.
    log.warn('extract-facts: strict rejected, used lenient fallback', {
      source,
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
    return AiService.languageModel(options?.model ?? DEFAULT_MODEL);
  }
  const provider = DXN.tryMake(options.provider);
  invariant(provider, `Invalid provider DXN: ${options.provider}`);
  return AiService.languageModel(options.model ?? DEFAULT_MODEL, { provider });
};
