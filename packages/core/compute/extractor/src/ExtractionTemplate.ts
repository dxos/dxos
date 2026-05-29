//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { AiService, ModelName } from '@dxos/ai';
import { type Operation } from '@dxos/compute';
import { type Database, type Obj } from '@dxos/echo';

import {
  ExtractError,
  type ExtractInput,
  type ExtractResult,
  type MatchResult,
  type ObjectExtractor,
} from './ObjectExtractor';
import { type Resolver } from './Resolver';

/** How to find an existing instance of a target type for create-or-update merge. */
export const IdentitySpec = Schema.Struct({
  /** Candidate field name(s) used to build the {@link Resolver} input (e.g. `['email']`). */
  fields: Schema.Array(Schema.String),
});
export interface IdentitySpec extends Schema.Schema.Type<typeof IdentitySpec> {}

/** A relation to create from the source object to an extracted target. */
export const RelationSpec = Schema.Struct({
  /** Relation typename. */
  typename: Schema.String,
});
export interface RelationSpec extends Schema.Schema.Type<typeof RelationSpec> {}

/** A target object type the LLM should extract, with merge identity and graph wiring. */
export const TargetSpec = Schema.Struct({
  /** ECHO typename to extract (drives the structured-output schema and getOrCreate). */
  type: Schema.String,
  /** How to find an existing instance for merge. Omit to always create. */
  identity: Schema.optional(IdentitySpec),
  /** Parent target type for containment via `Obj.setParent` (e.g. Segment → Trip). */
  parent: Schema.optional(Schema.String),
  /** Relations to create from the source to this target (e.g. Message → Trip). */
  relations: Schema.optional(Schema.Array(RelationSpec)),
});
export interface TargetSpec extends Schema.Schema.Type<typeof TargetSpec> {}

export const TagSpec = Schema.Struct({
  label: Schema.String,
  hue: Schema.optional(Schema.String),
});
export interface TagSpec extends Schema.Schema.Type<typeof TagSpec> {}

/**
 * Declarative description of an extraction: source type(s), the prompt/context handed to the
 * LLM, the target object types with their merge identity and graph wiring, and tags. Defined as
 * an Effect Schema so templates are validatable and ECHO-storable for the future user-authored
 * path. Code-registered templates ship as defaults today (hybrid).
 */
export const ExtractionTemplate = Schema.Struct({
  id: Schema.String,
  /** Short human-facing label (e.g. shown on a toolbar action). */
  title: Schema.String,
  description: Schema.String,
  kinds: Schema.Array(Schema.String),
  sourceTypes: Schema.Array(Schema.String),
  prompt: Schema.String,
  /** Cheap/fast model used for extraction. Defaults to {@link DEFAULT_MODEL}. */
  model: Schema.optional(ModelName),
  targets: Schema.Array(TargetSpec),
  tags: Schema.optional(Schema.Array(TagSpec)),
});
export interface ExtractionTemplate extends Schema.Schema.Type<typeof ExtractionTemplate> {}

export const DEFAULT_MODEL: ModelName = '@anthropic/claude-haiku-4-5';

/**
 * Code-side wiring for a template extractor. The LLM produces a payload validated against
 * `payloadSchema`; `assemble` turns that payload into the ECHO object graph using `getOrCreate`
 * (for identity merge driven by `template.targets`) and `Obj.setParent` (for containment).
 * Typed construction of nested/discriminated fields (e.g. `Segment.details`) lives in
 * `assemble`; identity / parent / relations / tags are driven by the {@link ExtractionTemplate}
 * data. The fully-declarative ECHO-template path (schema-by-typename) is a follow-up.
 */
export interface TemplateExtractorOptions<Payload, PayloadEncoded extends Record<string, unknown>> {
  readonly template: ExtractionTemplate;
  /** Optional registered operation, so the extractor is also a first-class operation. */
  readonly operation?: Operation.Definition<ExtractInput, ExtractResult>;
  /** Effect Schema for the LLM structured output. */
  readonly payloadSchema: Schema.Schema<Payload, PayloadEncoded>;
  /** Cheap pre-LLM candidacy check (keywords/domains/etc.). */
  readonly match: (source: Obj.Any) => MatchResult;
  /** Source text handed to the LLM. */
  readonly getSourceText: (source: Obj.Any) => string;
  /** Builds the object graph from the validated payload. Uses `getOrCreate` + `Obj.setParent`. */
  readonly assemble: (
    payload: Payload,
    context: { db: Database.Database; source: Obj.Any; template: ExtractionTemplate },
  ) => Effect.Effect<ExtractResult, ExtractError, Resolver>;
  readonly createRelation?: boolean;
}

const mergeTags = (
  fromResult: ExtractResult['tags'],
  fromTemplate: ExtractionTemplate['tags'],
): ExtractResult['tags'] => {
  const tags = [...(fromResult ?? []), ...(fromTemplate ?? [])];
  return tags.length > 0 ? tags : undefined;
};

/**
 * Build an {@link ObjectExtractor} from an {@link ExtractionTemplate}. The `extract` runs the
 * LLM (structured output against `payloadSchema`) then delegates to `assemble`; the LanguageModel
 * layer is provided internally from `AiService` so the residual requirements are just
 * `AiService.AiService` (for the model) and `Resolver` (for merge).
 */
export const makeTemplateExtractor = <Payload, PayloadEncoded extends Record<string, unknown>>(
  options: TemplateExtractorOptions<Payload, PayloadEncoded>,
): ObjectExtractor => {
  const { template, operation, payloadSchema, match, getSourceText, assemble, createRelation } = options;

  const extract = (input: ExtractInput): Effect.Effect<ExtractResult, ExtractError, AiService.AiService | Resolver> =>
    Effect.gen(function* () {
      const text = getSourceText(input.source);
      const response = yield* LanguageModel.generateObject({
        schema: payloadSchema,
        prompt: `${template.prompt}\n\n${text}`,
      });
      const result = yield* assemble(response.value, { db: input.db, source: input.source, template });
      const tags = mergeTags(result.tags, template.tags);
      return tags ? { ...result, tags } : result;
    }).pipe(
      Effect.provide(AiService.model(template.model ?? DEFAULT_MODEL).pipe(Layer.orDie)),
      Effect.catchAllCause((cause) =>
        Effect.fail(new ExtractError(`Template extraction failed: ${template.id}`, cause)),
      ),
    );

  return {
    id: template.id,
    title: template.title,
    description: template.description,
    kinds: template.kinds,
    sourceTypes: template.sourceTypes,
    match,
    operation,
    extract,
    createRelation,
  };
};
