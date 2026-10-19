//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as AiError from 'effect/ai/AiError';
import * as DecisionModel from 'effect/ai/DecisionModel';
import * as Config from 'effect/Config';
import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/http/FetchHttpClient';
import * as Layer from 'effect/Layer';

import { AiModelResolver, AiService, Model } from '@dxos/ai';
import { TypeSafeResolver } from '@dxos/ai/resolvers';

/**
 * TypeSafe's System One (jev) as a `DecisionModel` layer. The key is read from `TYPESAFE_API_KEY`
 * only — this code never calls `op`; locally, `op run --env-file tools/code-index/design.env.tpl`
 * puts the 1Password reference into the environment.
 */

export const MODEL = Model.typesafeJev;

/** True when a key is present, so a caller can fall back to the baseline scorer instead of failing. */
export const available = (env: Record<string, string | undefined> = process.env): boolean =>
  (env.TYPESAFE_API_KEY ?? '').length > 0;

const unavailable = (description: string) =>
  AiError.make({ module: 'code-index', method: 'design', reason: new AiError.InvalidUserInputError({ description }) });

export const layer = AiService.decisionModel(MODEL.id).pipe(
  Layer.provide(AiModelResolver.buildAiService),
  Layer.provide(
    TypeSafeResolver.make({
      typesafe: {
        apiKey: Config.Redacted('TYPESAFE_API_KEY').pipe(
          Effect.mapError(() => unavailable('TYPESAFE_API_KEY is not set.')),
        ),
      },
    }),
  ),
  Layer.provide(FetchHttpClient.layer),
  // jev is a static catalog entry the TypeSafe resolver always serves, so "not available" is a wiring defect.
  Layer.orDie,
);

/**
 * A decision model answering from a function instead of the network: tests script it, and a run
 * without a key uses one that refuses every call (callers already treat a failed call as "unscored").
 */
export const scripted = (
  answer: (options: DecisionModel.ProviderOptions) => DecisionModel.ProviderResponse['answers'],
): Layer.Layer<DecisionModel.DecisionModel> =>
  Layer.effect(
    DecisionModel.DecisionModel,
    DecisionModel.make({
      decide: (options) =>
        Effect.sync(() => ({ answers: answer(options), usage: { inputTokens: 100, outputTokens: 0 } })),
    }),
  );

/** A decision model that fails every call, for runs with no key. */
export const refusing: Layer.Layer<DecisionModel.DecisionModel> = Layer.effect(
  DecisionModel.DecisionModel,
  DecisionModel.make({ decide: () => Effect.fail(unavailable('TYPESAFE_API_KEY is not set.')) }),
);
