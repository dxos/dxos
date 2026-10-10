//
// Copyright 2026 DXOS.org
//

//
// The decision models the scripts grade diagrams with. Jev goes to TypeSafe's System One API
// (`TYPESAFE_API_KEY`) and reads no images. Clef and Clef Flash go straight to Workers AI on a
// Cloudflare account (`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`), the same System One wire with
// the `images` extension, so a judge can be shown the rendered page.
//

import * as DecisionModel from 'effect/ai/DecisionModel';
import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/http/FetchHttpClient';
import * as HttpClient from 'effect/http/HttpClient';
import * as HttpClientRequest from 'effect/http/HttpClientRequest';
import * as HttpClientResponse from 'effect/http/HttpClientResponse';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Redacted from 'effect/Redacted';
import * as Schema from 'effect/Schema';

import { TypeSafeResolver } from '@dxos/ai/resolvers';

export type Judge = 'jev' | 'clef' | 'clef-flash';

export const JUDGES: readonly Judge[] = ['jev', 'clef', 'clef-flash'];

export const isJudge = (value: string): value is Judge => (JUDGES as readonly string[]).includes(value);

/** Whether a judge can read images; jev is text-only. */
export const seesImages = (judge: Judge): boolean => judge !== 'jev';

/** What `layout` says when the drawing travels as an image. */
export const IMAGE_NOTE = 'The attached image is the page as drawn.';

const workersAiUrl = (model: string) => {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!account) {
    throw new Error('CLOUDFLARE_ACCOUNT_ID is not set.');
  }
  return `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/@cf/cloudflare/${model}`;
};

/** Workers AI's REST envelope; the resolver validates `result` itself. */
const Envelope = Schema.Struct({ result: Schema.optional(Schema.Unknown), errors: Schema.optional(Schema.Unknown) });

/**
 * Sends a System One call to Workers AI's REST API and unwraps its envelope (`{ result, success,
 * errors }`), so the resolver reads the answers it expects.
 */
const workersAiClient = (model: string) =>
  Effect.map(HttpClient.HttpClient, (fetch) =>
    HttpClient.make((request) =>
      Effect.gen(function* () {
        const response = yield* fetch.execute(
          request.pipe(
            HttpClientRequest.setUrl(workersAiUrl(model)),
            HttpClientRequest.bearerToken(process.env.CLOUDFLARE_API_TOKEN ?? ''),
          ),
        );
        const json = yield* response.json;
        // A body that is not an envelope goes through as-is for the resolver's validation to report.
        const body = Option.match(Schema.decodeUnknownOption(Envelope)(json), {
          onNone: () => json,
          onSome: ({ result, errors }) => result ?? { errors },
        });
        return HttpClientResponse.fromWeb(request, Response.json(body, { status: response.status }));
      }),
    ),
  );

/** A `DecisionModel` for one judge. */
export const decisionModel = (judge: Judge): Layer.Layer<DecisionModel.DecisionModel> =>
  judge === 'jev'
    ? Layer.effect(
        DecisionModel.DecisionModel,
        TypeSafeResolver.makeDecisionModel('jev-latest', {
          apiKey: Effect.sync(() => Redacted.make(process.env.TYPESAFE_API_KEY ?? '')),
        }),
      ).pipe(Layer.provide(FetchHttpClient.layer))
    : Layer.effect(
        DecisionModel.DecisionModel,
        TypeSafeResolver.makeDecisionModel(judge, { apiKey: Effect.succeed(undefined), images: true }),
      ).pipe(
        Layer.provide(Layer.effect(HttpClient.HttpClient, workersAiClient(judge))),
        Layer.provide(FetchHttpClient.layer),
      );
