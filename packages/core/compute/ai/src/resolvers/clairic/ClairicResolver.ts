//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as AiError from 'effect/ai/AiError';
import type * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as HttpClient from 'effect/http/HttpClient';
import type * as HttpClientError from 'effect/http/HttpClientError';
import * as HttpClientRequest from 'effect/http/HttpClientRequest';
import * as HttpClientResponse from 'effect/http/HttpClientResponse';
import * as Layer from 'effect/Layer';
import type * as Redacted from 'effect/Redacted';
import * as Schema from 'effect/Schema';

import * as AiModelResolver from '../../AiModelResolver.ts';
import { AiModelNotAvailableError } from '../../errors.ts';
import * as ExtractionModel from '../../ExtractionModel.ts';
import * as Model from '../../Model.ts';

/** The extraction models this resolver serves. */
export const models: readonly Model.Model[] = Model.extractionModels;

//
// Wire protocol (https://developers.cloudflare.com/workers-ai/models/clairic/): one POST carries the
// state and a map of named, typed fields; every field is answered in the same pass.
//

/** A field as Clairic takes it: the same spec with its options in snake case. */
export const toWireField = (field: ExtractionModel.Field): Record<string, unknown> => {
  const { nullThreshold, ...rest } = field;
  return nullThreshold === undefined ? rest : { ...rest, null_threshold: nullThreshold };
};

const Value = Schema.Union([Schema.String, Schema.Number, Schema.Array(Schema.Union([Schema.String, Schema.Number]))]);
const Point = Schema.optional(Schema.Union([Schema.String, Schema.Number]));

/** An answer as Clairic returns it; fields it reports for other types are ignored. */
export const WireAnswer = Schema.Struct({
  type: Schema.String,
  value: Schema.NullOr(Value),
  confidence: Schema.optional(Schema.Number),
  p_null: Schema.optional(Schema.Number),
  median: Point,
  mean: Point,
  p10: Point,
  p90: Point,
});

export const ExtractResponse = Schema.Struct({
  model: Schema.optional(Schema.String),
  answers: Schema.Record(Schema.String, WireAnswer),
  truncated: Schema.optional(Schema.Boolean),
  usage: Schema.optional(Schema.Struct({ input_tokens: Schema.Number, output_tokens: Schema.Number })),
});

export type ExtractResponse = typeof ExtractResponse.Type;

/** The provider answer for a wire answer. */
export const toAnswer = (answer: typeof WireAnswer.Type): ExtractionModel.ProviderAnswer => ({
  value: answer.value,
  confidence: answer.confidence,
  pNull: answer.p_null,
  ...(answer.type === 'estimate'
    ? { estimate: { median: answer.median, mean: answer.mean, p10: answer.p10, p90: answer.p90 } }
    : {}),
});

//
// Service.
//

export type Options<R = never> = {
  /** Undefined sends no credential, for a proxy that authenticates upstream itself (EDGE). */
  readonly apiKey: Effect.Effect<Redacted.Redacted<string> | undefined, AiError.AiError, R>;
  /** Read per call, so a changed endpoint applies without rebuilding the model. */
  readonly endpoint: () => string;
  /** How long one call may take; a stalled endpoint otherwise holds every extraction waiting on it. */
  readonly timeout?: Duration.Input;
};

export const DEFAULT_TIMEOUT: Duration.Input = '30 seconds';

const aiError = (reason: AiError.AiErrorReason): AiError.AiError =>
  AiError.make({ module: 'Clairic', method: 'extract', reason });

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

/** An `ExtractionModel` answering through Clairic's `backend` model. */
export const makeExtractionModel = <R = never>(
  backend: string,
  { apiKey, endpoint, timeout = DEFAULT_TIMEOUT }: Options<R>,
): Effect.Effect<ExtractionModel.Service, never, HttpClient.HttpClient | R> =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    // Captured so `extract` can resolve the key without the caller providing its services.
    const context = yield* Effect.context<R>();
    return ExtractionModel.make(({ state, fields, referenceDate }) =>
      Effect.gen(function* () {
        const key = yield* apiKey;
        const request = HttpClientRequest.post(endpoint()).pipe(
          (request) => (key ? HttpClientRequest.bearerToken(request, key) : request),
          HttpClientRequest.bodyJsonUnsafe({
            model: backend,
            state,
            fields: Object.fromEntries(Object.entries(fields).map(([name, field]) => [name, toWireField(field)])),
            ...(referenceDate ? { reference_date: referenceDate } : {}),
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
                aiError(new AiError.InternalProviderError({ description: 'Clairic did not answer in time' })),
              ),
          }),
        );
        // A 200 proves nothing about the body, so the payload is validated rather than asserted.
        const body = yield* Schema.decodeUnknownEffect(ExtractResponse)(json).pipe(
          Effect.mapError((error) => aiError(AiError.InvalidOutputError.fromSchemaError(error))),
        );
        return {
          answers: Object.fromEntries(Object.entries(body.answers).map(([name, answer]) => [name, toAnswer(answer)])),
          usage: { inputTokens: body.usage?.input_tokens, outputTokens: body.usage?.output_tokens },
        };
      }).pipe(Effect.provide(context)),
    );
  });

/** Resolves the extraction models in {@link models}; the other kinds go upstream. */
export const make = <R = never>(
  options: Options<R>,
): Layer.Layer<AiModelResolver.AiModelResolver, never, HttpClient.HttpClient | R> =>
  AiModelResolver.extractionResolver(
    { name: 'Clairic' },
    Effect.gen(function* () {
      const context = yield* Effect.context<HttpClient.HttpClient | R>();
      return (requested, resolveOptions) => {
        const model = models.find(
          (model) =>
            model.id === requested &&
            (resolveOptions?.provider === undefined || resolveOptions.provider === model.provider),
        );
        return model
          ? Layer.effect(
              ExtractionModel.ExtractionModel,
              makeExtractionModel(model.backend, options).pipe(Effect.provide(context)),
            )
          : Layer.unwrap(Effect.fail(new AiModelNotAvailableError(requested)));
      };
    }),
  );
