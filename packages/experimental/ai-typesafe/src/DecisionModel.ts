//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { SchemaAST } from '@dxos/effect';

import { DecisionError, DecisionSchemaError } from './errors.ts';

//
// Wire protocol (https://docs.typesafe.ai/api): one POST carries the state and a map of named
// questions, each answered independently, so a schema compiles to a single round trip.
//

/** A question as the System One API takes it. */
export type Question =
  | { readonly type: 'noul'; readonly instructions: string; readonly criteria?: NoulCriteria }
  | { readonly type: 'choice'; readonly instructions: string; readonly criteria: Record<string, string> }
  | { readonly type: 'score'; readonly instructions: string; readonly criteria: readonly string[] };

export type NoulCriteria = { readonly true: string; readonly false: string };

/** An answer as the System One API returns it; which member is set follows `type`. */
export type Answer = {
  readonly type: 'noul' | 'choice' | 'score';
  readonly noul?: number;
  readonly choice?: string;
  readonly score?: number;
  readonly probabilities?: Record<string, number>;
  /** Score answers only: the criterion each scale position stands for. */
  readonly legend?: Record<string, string>;
  readonly confidence?: number;
};

export type Usage = { readonly input_tokens: number; readonly output_tokens: number };

export type EvaluateRequest = {
  /** The content every question is evaluated against. */
  readonly state: unknown;
  readonly questions: Record<string, Question>;
};

export type EvaluateResponse = {
  readonly answers: Record<string, Answer>;
  readonly usage?: Usage;
};

//
// Service.
//

export interface Service {
  /** Evaluates every question against the state in one call. */
  readonly evaluate: (request: EvaluateRequest) => Effect.Effect<EvaluateResponse, DecisionError>;
}

/** Provider-agnostic decision model, in the shape of `LanguageModel` from `effect/unstable/ai`. */
export class DecisionModel extends Context.Service<DecisionModel, Service>()('@dxos/ai-typesafe/DecisionModel') {}

/** Adapts a provider's own `evaluate` to the service contract. */
export const make = (service: Service): Service => service;

export const layer = (service: Service): Layer.Layer<DecisionModel> => Layer.succeed(DecisionModel, service);

//
// Question primitives. Each carries its question on an annotation, so a schema is both the request
// (what to ask) and the response contract (what the answer must satisfy).
//

const QuestionAnnotationId = 'dxos.org/typesafe/question';

/** The part of a question the schema fixes; `instructions` come from the field's description. */
type QuestionAnnotation =
  | { readonly type: 'noul'; readonly criteria?: NoulCriteria }
  | { readonly type: 'choice'; readonly criteria: Record<string, string> }
  | { readonly type: 'score'; readonly criteria: readonly string[] };

/** Model-reported confidence in its own answer. */
export const Confidence = Schema.Number.check(Schema.isBetween({ minimum: 0, maximum: 1 }));

/**
 * Validates a statement against the state, as a truth value in [0, 1] — the model's own probability
 * that the statement holds, not a hedge over a boolean.
 *
 * Declare the field as `Schema.Boolean` instead to have the truth value thresholded away.
 */
export const Noul = Schema.Number.check(Schema.isBetween({ minimum: 0, maximum: 1 })).annotate({
  [QuestionAnnotationId]: { type: 'noul' } satisfies QuestionAnnotation,
});

/** Criteria as the API takes them: one description per option, keyed by the option itself. */
// `Array.isArray` does not narrow a readonly array, so the guard states it.
const isOptionList = (options: readonly string[] | Record<string, string>): options is readonly string[] =>
  Array.isArray(options);

const toChoiceCriteria = (options: readonly string[] | Record<string, string>): Record<string, string> =>
  isOptionList(options) ? Object.fromEntries(options.map((option) => [option, option])) : options;

/**
 * Selects one of the options, keeping the model's confidence. Options are given bare, or as a map
 * of option to the criterion that selects it — the form the API scores against.
 *
 * Declare the field as `Schema.Literals` instead to keep the choice and drop the confidence.
 */
export const Choice: {
  <const Options extends readonly [string, ...string[]]>(
    ...options: Options
  ): Schema.Struct<{ _tag: Schema.Literals<Options>; confidence: typeof Confidence }>;
  <const Options extends Record<string, string>>(
    criteria: Options,
  ): Schema.Struct<{ _tag: Schema.Literals<(keyof Options & string)[]>; confidence: typeof Confidence }>;
} = (
  ...args: readonly string[] | readonly [Record<string, string>]
): Schema.Struct<{ _tag: Schema.Literals<string[]>; confidence: typeof Confidence }> => {
  const [head] = args;
  const criteria = toChoiceCriteria(typeof head === 'string' ? (args as readonly string[]) : head);
  return Schema.Struct({
    _tag: Schema.Literals(Object.keys(criteria)),
    confidence: Confidence,
  }).annotate({ [QuestionAnnotationId]: { type: 'choice', criteria } satisfies QuestionAnnotation });
};

/**
 * Rates the state against ordered criteria, returning a position on that scale (0 for the first
 * criterion, `criteria.length - 1` for the last) and the model's confidence.
 */
export const Score = <const Criteria extends readonly [string, ...string[]]>(
  ...criteria: Criteria
): Schema.Struct<{ score: typeof Schema.Number; confidence: typeof Confidence }> =>
  Schema.Struct({ score: Schema.Number, confidence: Confidence }).annotate({
    [QuestionAnnotationId]: { type: 'score', criteria } satisfies QuestionAnnotation,
  });

//
// Compilation: a struct of fields becomes a question map, and the answers become the struct.
//

type Field = { readonly question: Question; readonly decode: (answer: Answer) => unknown };

const readAnnotations = (schema: Schema.Top): Record<string, unknown> =>
  (SchemaAST.resolveAnnotations(schema.ast) ?? {}) as Record<string, unknown>;

const compileField = (name: string, schema: Schema.Top): Field => {
  const annotations = readAnnotations(schema);
  const instructions = annotations.description;
  if (typeof instructions !== 'string') {
    throw new DecisionSchemaError({ field: name, reason: 'a question needs a description to ask it' });
  }

  const declared = annotations[QuestionAnnotationId] as QuestionAnnotation | undefined;
  if (declared) {
    return {
      question: { ...declared, instructions } as Question,
      decode: (answer) => {
        switch (declared.type) {
          case 'noul':
            return answer.noul;
          case 'choice':
            return { _tag: answer.choice, confidence: answer.confidence };
          case 'score':
            return { score: answer.score, confidence: answer.confidence };
        }
      },
    };
  }

  // A bare literal union is a choice whose confidence the caller did not ask for.
  const literals = (schema as { readonly literals?: readonly SchemaAST.LiteralValue[] }).literals;
  if (literals?.every((literal) => typeof literal === 'string')) {
    return {
      question: { type: 'choice', instructions, criteria: toChoiceCriteria(literals as string[]) },
      decode: (answer) => answer.choice,
    };
  }

  // A boolean is a noul whose truth value the caller did not ask for.
  if (SchemaAST.isBooleanKeyword(schema.ast)) {
    return {
      question: { type: 'noul', instructions },
      decode: (answer) => (answer.noul ?? 0) >= 0.5,
    };
  }

  throw new DecisionSchemaError({
    field: name,
    reason: 'expected a question primitive, a string literal union, or a boolean',
  });
};

/** Compiles a struct into the question map sent to the model, alongside the decoders for its answers. */
export const compile = (schema: Schema.Struct<Schema.Struct.Fields>): Record<string, Field> =>
  Object.fromEntries(
    Object.entries(schema.fields).map(([name, field]) => [name, compileField(name, field as Schema.Top)]),
  );

//
// Generation.
//

export type GenerateOptions<S extends Schema.Struct<Schema.Struct.Fields>> = {
  /** The state every question is evaluated against. */
  readonly context: unknown;
  readonly schema: S;
};

/**
 * Asks every field of the schema as its own question, in one call, and decodes the answers back
 * into the schema's type — so what the caller declared is what the caller gets.
 */
export const generate = <S extends Schema.Struct<Schema.Struct.Fields>>({
  context,
  schema,
}: GenerateOptions<S>): Effect.Effect<
  S['Type'],
  DecisionError | DecisionSchemaError,
  DecisionModel | S['DecodingServices']
> =>
  Effect.gen(function* () {
    const fields = yield* Effect.try({
      try: () => compile(schema),
      catch: (error) => error as DecisionSchemaError,
    });

    const model = yield* DecisionModel;
    const response = yield* model.evaluate({
      state: context,
      questions: Object.fromEntries(Object.entries(fields).map(([name, field]) => [name, field.question])),
    });

    const decoded = Object.fromEntries(
      Object.entries(fields).map(([name, field]) => {
        const answer = response.answers[name];
        return [name, answer === undefined ? undefined : field.decode(answer)];
      }),
    );

    return yield* Schema.decodeUnknownEffect(schema)(decoded).pipe(
      Effect.mapError((error) => new DecisionError({ answers: response.answers }, { cause: error })),
    );
  });
