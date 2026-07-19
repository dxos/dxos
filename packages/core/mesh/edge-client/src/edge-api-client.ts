//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as HttpApiClient from '@effect/platform/HttpApiClient';
import * as Effect from 'effect/Effect';

import { EdgeApi } from '@dxos/edge-protocol';

/**
 * Effect client derived from `@dxos/edge-protocol`'s full `EdgeApi` `HttpApi` contract.
 * Replacement for the hand-written `EdgeHttpClient`; groups and endpoints are namespaced as
 * `client.<group>.<endpoint>(...)`. `@dxos/*` identity types (`SpaceId`, etc.) resolve to this
 * repo's workspace copies because `@dxos/edge-protocol` declares them as peer dependencies.
 */
export const makeEdgeApiClient = (baseUrl: string) =>
  HttpApiClient.make(EdgeApi, { baseUrl }).pipe(Effect.provide(FetchHttpClient.layer), Effect.orDie);

export type EdgeApiClient = Effect.Effect.Success<ReturnType<typeof makeEdgeApiClient>>;

/**
 * Promise-based smoke-test helper for manually verifying the derived client against a live edge instance.
 */
export const checkEdgeApiHealth = (baseUrl: string): Promise<{ status: 'ok' }> =>
  Effect.gen(function* () {
    const client = yield* makeEdgeApiClient(baseUrl);
    const response = yield* client.status.health();
    return response.data;
  }).pipe(Effect.runPromise);
