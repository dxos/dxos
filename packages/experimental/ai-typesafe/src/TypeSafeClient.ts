//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Redacted from 'effect/Redacted';
import * as Schema from 'effect/Schema';

import * as DecisionModel from './DecisionModel.ts';
import { DecisionError } from './errors.ts';

export const DEFAULT_ENDPOINT = 'https://api.typesafe.ai/v1/systemone';

/** The System One model to evaluate against; `jev-latest` tracks the current release. */
export const DEFAULT_MODEL = 'jev-latest';

export type Options = {
  /** Omitted when a proxy authenticates the call upstream (e.g. EDGE with its platform key). */
  readonly apiKey?: Redacted.Redacted<string>;
  readonly endpoint?: string;
  readonly model?: string;
  /** Injected in tests; defaults to the platform's `fetch`. */
  readonly fetch?: typeof globalThis.fetch;
};

/**
 * Backs the decision model with TypeSafe's System One endpoint. `fetch` is a platform boundary, so
 * the promise is wrapped here rather than leaking out of the service.
 */
export const make = ({
  apiKey,
  endpoint = DEFAULT_ENDPOINT,
  model = DEFAULT_MODEL,
  fetch = globalThis.fetch,
}: Options): DecisionModel.Service =>
  DecisionModel.make({
    evaluate: ({ state, questions }) =>
      Effect.tryPromise({
        try: async (signal) => {
          const response = await fetch(endpoint, {
            method: 'POST',
            signal,
            headers: {
              ...(apiKey ? { Authorization: `Bearer ${Redacted.value(apiKey)}` } : {}),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ model, state, questions }),
          });

          if (!response.ok) {
            throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
          }

          return await response.json();
        },
        catch: (error) => new DecisionError({ endpoint, model }, { cause: error }),
      }).pipe(
        // A 200 proves nothing about the body, so the payload is validated rather than asserted.
        Effect.flatMap((body) =>
          Schema.decodeUnknownEffect(DecisionModel.EvaluateResponse)(body).pipe(
            Effect.mapError((error) => new DecisionError({ endpoint, model }, { cause: error })),
          ),
        ),
      ),
  });

export const layer = (options: Options): Layer.Layer<DecisionModel.DecisionModel> => DecisionModel.layer(make(options));
