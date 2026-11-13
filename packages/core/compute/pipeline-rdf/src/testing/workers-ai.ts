//
// Copyright 2026 DXOS.org
//

import * as DecisionModel from 'effect/ai/DecisionModel';
import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/http/FetchHttpClient';
import * as HttpClient from 'effect/http/HttpClient';
import * as HttpClientResponse from 'effect/http/HttpClientResponse';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Redacted from 'effect/Redacted';
import * as Schema from 'effect/Schema';
import { existsSync, readFileSync } from 'node:fs';

import { AiModelNotAvailableError, AiService, ExtractionModel, Model } from '@dxos/ai';
import { ClairicResolver, TypeSafeResolver } from '@dxos/ai/resolvers';
import { type DXN } from '@dxos/keys';

export type WorkersAiOptions = {
  readonly accountId: string;
  readonly apiToken: Redacted.Redacted<string>;
};

/** The Workers AI model path for each System One model the REST API serves. */
const PATHS = new Map<DXN.DXN, string>([
  [Model.cloudflareClef.id, '@cf/cloudflare/clef'],
  [Model.cloudflareClefFlash.id, '@cf/cloudflare/clef-flash'],
  [Model.cloudflareClairic.id, '@cf/cloudflare/clairic'],
]);

/** Workers AI's REST envelope; the resolvers validate `result` themselves. */
const Envelope = Schema.Struct({ result: Schema.optional(Schema.Unknown), errors: Schema.optional(Schema.Unknown) });

/** Unwraps the REST envelope (`{ result, success, errors }`) so a resolver reads the body it expects. */
const unwrapEnvelope = Effect.map(HttpClient.HttpClient, (fetch) =>
  HttpClient.make((request) =>
    Effect.gen(function* () {
      const response = yield* fetch.execute(request);
      const json = yield* response.json;
      const body = Option.match(Schema.decodeUnknownOption(Envelope)(json), {
        onNone: () => json,
        onSome: ({ result, errors }) => result ?? { errors },
      });
      return HttpClientResponse.fromWeb(request, Response.json(body, { status: response.status }));
    }),
  ),
);

const client = Layer.effect(HttpClient.HttpClient, unwrapEnvelope).pipe(Layer.provide(FetchHttpClient.layer));

const notAvailable = <A>(model: DXN.DXN): Layer.Layer<A, AiModelNotAvailableError> =>
  Layer.unwrap(Effect.fail(new AiModelNotAvailableError(model)));

/**
 * An `AiService` that answers Clairic, Clef and Clef Flash straight from Workers AI's REST API on a Cloudflare account,
 * and every language model through `base`, so System One extraction and its LLM fallback run without EDGE.
 */
export const workersAiSystemOneService = (
  { accountId, apiToken }: WorkersAiOptions,
  base: Layer.Layer<AiService.AiService, unknown>,
): Layer.Layer<AiService.AiService, unknown> =>
  Layer.effect(
    AiService.AiService,
    Effect.gen(function* () {
      const llm = yield* AiService.tag;
      const endpoint = (model: DXN.DXN) => () =>
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${PATHS.get(model)}`;
      const apiKey = Effect.succeed(apiToken);
      const backend = (model: DXN.DXN) =>
        [...Model.decisionModels, ...Model.extractionModels].find(({ id }) => id === model)?.backend ?? '';
      return AiService.make({
        languageModel: llm.languageModel,
        decisionModel: (model) =>
          PATHS.has(model) && model !== Model.cloudflareClairic.id
            ? Layer.effect(
                DecisionModel.DecisionModel,
                TypeSafeResolver.makeDecisionModel(backend(model), { apiKey, endpoint: endpoint(model) }),
              ).pipe(Layer.provide(client))
            : notAvailable(model),
        extractionModel: (model) =>
          model === Model.cloudflareClairic.id
            ? Layer.effect(
                ExtractionModel.ExtractionModel,
                ClairicResolver.makeExtractionModel(backend(model), { apiKey, endpoint: endpoint(model) }),
              ).pipe(Layer.provide(client))
            : notAvailable(model),
      });
    }),
  ).pipe(Layer.provide(base));

/** A secret from the environment, else from the first `KEY=value` file that sets it; never logged. */
export const readCredential = (name: string, files: readonly string[]): string | undefined =>
  process.env[name] ||
  files.flatMap((file) => (existsSync(file) ? [parseEnvFile(readFileSync(file, 'utf8'))[name]] : [])).find(Boolean);

/** `KEY=value` lines; an empty value or a comment reads as nothing. */
export const parseEnvFile = (text: string): Readonly<Record<string, string>> =>
  Object.fromEntries(
    text.split('\n').flatMap((line) => {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      const value = match?.[2].replace(/^['"]|['"]$/g, '');
      return match && value ? [[match[1], value]] : [];
    }),
  );
