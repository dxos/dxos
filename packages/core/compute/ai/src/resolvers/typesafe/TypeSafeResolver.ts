//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as Redacted from 'effect/Redacted';
import * as Schema from 'effect/Schema';
import * as AiError from 'effect/unstable/ai/AiError';
import type * as Decision from 'effect/unstable/ai/Decision';
import * as DecisionModel from 'effect/unstable/ai/DecisionModel';
import * as HttpClient from 'effect/unstable/http/HttpClient';
import type * as HttpClientError from 'effect/unstable/http/HttpClientError';
import * as HttpClientRequest from 'effect/unstable/http/HttpClientRequest';
import * as HttpClientResponse from 'effect/unstable/http/HttpClientResponse';

import * as AiModelResolver from '../../AiModelResolver.ts';
import { AiModelNotAvailableError } from '../../errors.ts';
import * as Model from '../../Model.ts';
import * as Provider from '../../Provider.ts';

/**
 * TypeSafe's System One (https://docs.typesafe.ai/api): a decision model that answers typed
 * questions about a state rather than generating text.
 */
export const DEFAULT_ENDPOINT = 'https://api.typesafe.ai/v1/systemone';

/** The decision models this resolver serves, one per provider. */
export const models: readonly Model.Model[] = [Model.typesafeJev, Model.cloudflareJev];

//
// Wire protocol: one POST carries the state and a map of named questions, answered independently.
//

type NoulCriteria = { readonly true: string; readonly false: string };

/** A question as the System One API takes it. */
export type Question =
  | { readonly type: 'noul'; readonly instructions: string; readonly criteria?: NoulCriteria }
  | { readonly type: 'choice'; readonly instructions: string; readonly criteria: Readonly<Record<string, string>> }
  | { readonly type: 'score'; readonly instructions: string; readonly criteria: readonly string[] };

const UnitInterval = Schema.Number.check(Schema.isBetween({ minimum: 0, maximum: 1 }));

/**
 * An answer as the System One API returns it, discriminated on `type` — a payload that does not
 * match its own `type` is a malformed answer, not an answer with fields left unset.
 */
export const Answer = Schema.Union([
  Schema.Struct({ type: Schema.Literal('noul'), noul: UnitInterval }),
  Schema.Struct({
    type: Schema.Literal('choice'),
    choice: Schema.String,
    confidence: UnitInterval,
    probabilities: Schema.optional(Schema.Record(Schema.String, UnitInterval)),
  }),
  Schema.Struct({
    type: Schema.Literal('score'),
    score: Schema.Number,
    confidence: UnitInterval,
    /** Keyed by scale position (`"0"`, `"1"`, …). */
    probabilities: Schema.optional(Schema.Record(Schema.String, UnitInterval)),
    /** The criterion each scale position stands for. */
    legend: Schema.optional(Schema.Record(Schema.String, Schema.String)),
  }),
]);

export type Answer = typeof Answer.Type;

export const EvaluateResponse = Schema.Struct({
  model: Schema.optional(Schema.String),
  answers: Schema.Record(Schema.String, Answer),
  usage: Schema.optional(Schema.Struct({ input_tokens: Schema.Number, output_tokens: Schema.Number })),
});

export type EvaluateResponse = typeof EvaluateResponse.Type;

/** The System One question for an Effect decision. */
export const toQuestion = (decision: Decision.Any): Question => {
  switch (decision._tag) {
    case 'Probability':
      return decision.criteria
        ? { type: 'noul', instructions: decision.instructions, criteria: decision.criteria }
        : { type: 'noul', instructions: decision.instructions };
    case 'Classify':
      return { type: 'choice', instructions: decision.instructions, criteria: decision.criteria };
    case 'Rate':
      return { type: 'score', instructions: decision.instructions, criteria: decision.criteria };
  }
};

/**
 * A full distribution over `labels`, as `DecisionModel` requires. System One omits options it gives
 * no weight, rounds what it reports, and may report no distribution at all — in which case the
 * answer it committed to carries all of it.
 */
const toDistribution = (
  labels: readonly string[],
  reported: (label: string, index: number) => number | undefined,
  committed: string | undefined,
): Record<string, number> => {
  const weights = labels.map((label, index) => reported(label, index) ?? 0);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return Object.fromEntries(
    labels.map((label, index) => [label, total > 0 ? weights[index] / total : label === committed ? 1 : 0]),
  );
};

/**
 * The Effect provider answer for a System One answer. A mismatched answer type is passed through
 * as-is so `DecisionModel` rejects it with the decision it failed.
 */
export const toProviderAnswer = (decision: Decision.Any, answer: Answer): DecisionModel.ProviderAnswer => {
  switch (answer.type) {
    case 'noul':
      return { _tag: 'Probability', probability: answer.noul };
    case 'choice': {
      const labels = decision._tag === 'Classify' ? Object.keys(decision.criteria) : [];
      return {
        _tag: 'Classify',
        label: answer.choice,
        confidence: answer.confidence,
        probabilities: toDistribution(labels, (label) => answer.probabilities?.[label], answer.choice),
      };
    }
    case 'score': {
      const levels = decision._tag === 'Rate' ? decision.criteria : [];
      return {
        _tag: 'Rate',
        rating: answer.score,
        confidence: answer.confidence,
        probabilities: toDistribution(
          levels,
          (level, index) => answer.probabilities?.[String(index)] ?? answer.probabilities?.[level],
          levels[Math.round(answer.score)],
        ),
      };
    }
  }
};

//
// Service.
//

export type Options<R = never> = {
  /**
   * Resolved per call, so a key connected or revoked mid-session applies to the next decision.
   * Undefined sends no credential, for a proxy that authenticates upstream itself (EDGE).
   */
  readonly apiKey: Effect.Effect<Redacted.Redacted<string> | undefined, AiError.AiError, R>;
  /** Read per call, so a changed endpoint applies without rebuilding the model. */
  readonly endpoint?: () => string;
  /** How long one call may take; a stalled endpoint otherwise holds every decision waiting on it. */
  readonly timeout?: Duration.Input;
};

export const DEFAULT_TIMEOUT: Duration.Input = '30 seconds';

const MODULE = 'TypeSafe';

const aiError = (reason: AiError.AiErrorReason): AiError.AiError =>
  AiError.make({ module: MODULE, method: 'decide', reason });

const fromHttpClientError = (error: HttpClientError.HttpClientError): AiError.AiError => {
  switch (error.reason._tag) {
    case 'TransportError':
    case 'EncodeError':
    case 'InvalidUrlError':
      return aiError(AiError.NetworkError.fromRequestError(error.reason));
    default:
      return aiError(
        AiError.reasonFromHttpStatus({ status: error.reason.response.status, description: error.message }),
      );
  }
};

/** A `DecisionModel` answering through System One's `backend` model. */
export const makeDecisionModel = <R = never>(
  backend: string,
  { apiKey, endpoint = () => DEFAULT_ENDPOINT, timeout = DEFAULT_TIMEOUT }: Options<R>,
): Effect.Effect<DecisionModel.DecisionModel, never, HttpClient.HttpClient | R> =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    // Captured so `decide` can resolve the key without the caller providing its services.
    const context = yield* Effect.context<R>();
    return yield* DecisionModel.make({
      decide: ({ state, decisions }) =>
        Effect.gen(function* () {
          const key = yield* apiKey;
          const request = HttpClientRequest.post(endpoint()).pipe(
            (request) => (key ? HttpClientRequest.bearerToken(request, key) : request),
            HttpClientRequest.bodyJsonUnsafe({
              model: backend,
              state,
              questions: Object.fromEntries(
                Object.entries(decisions).map(([name, decision]) => [name, toQuestion(decision)]),
              ),
            }),
          );
          const json = yield* client.execute(request).pipe(
            Effect.flatMap(HttpClientResponse.filterStatusOk),
            Effect.flatMap((response) => response.json),
            Effect.mapError(fromHttpClientError),
            Effect.timeoutOrElse({
              duration: timeout,
              orElse: () =>
                Effect.fail(
                  aiError(new AiError.InternalProviderError({ description: 'System One did not answer in time' })),
                ),
            }),
          );
          // A 200 proves nothing about the body, so the payload is validated rather than asserted.
          const body = yield* Schema.decodeUnknownEffect(EvaluateResponse)(json).pipe(
            Effect.mapError((error) => aiError(AiError.InvalidOutputError.fromSchemaError(error))),
          );

          return {
            answers: Object.fromEntries(
              Object.entries(decisions).flatMap(([name, decision]) => {
                const answer = body.answers[name];
                return answer ? [[name, toProviderAnswer(decision, answer)]] : [];
              }),
            ),
            usage: { inputTokens: body.usage?.input_tokens, outputTokens: body.usage?.output_tokens },
          };
        }).pipe(Effect.provide(context)),
    });
  });

/** How to reach each provider; a model whose provider has no route does not resolve. */
export type Routes<R = never> = {
  /** TypeSafe's own System One API ({@link Model.typesafeJev}). */
  readonly typesafe?: Options<R>;
  /** Cloudflare Workers AI's `typesafe/jev` behind a System One endpoint ({@link Model.cloudflareJev}). */
  readonly workersAi?: Options<R>;
};

/**
 * Resolves jev per provider, when the request names no provider or names the model's own; language
 * models go upstream.
 */
export const make = <R = never>(
  routes: Routes<R>,
): Layer.Layer<AiModelResolver.AiModelResolver, never, HttpClient.HttpClient | R> =>
  AiModelResolver.decisionResolver(
    { name: 'TypeSafe' },
    Effect.gen(function* () {
      const context = yield* Effect.context<HttpClient.HttpClient | R>();
      const byProvider = new Map([
        [Provider.typesafe.id, routes.typesafe],
        [Provider.workersAi.id, routes.workersAi],
      ]);
      return (id, resolveOptions) => {
        const model = models.find(
          (model) =>
            model.id === id && (resolveOptions?.provider === undefined || resolveOptions.provider === model.provider),
        );
        const options = model && byProvider.get(model.provider);
        return model && options
          ? Layer.effect(
              DecisionModel.DecisionModel,
              makeDecisionModel(model.backend, options).pipe(Effect.provide(context)),
            )
          : Layer.unwrap(Effect.fail(new AiModelNotAvailableError(id)));
      };
    }),
  );
