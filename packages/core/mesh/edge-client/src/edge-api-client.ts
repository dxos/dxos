//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';
import * as HttpApiClient from 'effect/unstable/httpapi/HttpApiClient';

import { EdgeApi } from '@dxos/edge-protocol';

/**
 * `FetchHttpClient.layer`, with its `Fetch` reference pinned to an indirection that calls
 * `globalThis.fetch` fresh on every request rather than falling through to the reference's own
 * default. That default (`Context.Reference(..., { defaultValue: () => globalThis.fetch })`) is
 * memoized process-wide on first read — whichever value `globalThis.fetch` holds at that moment is
 * cached forever, so a later reassignment (tests stubbing `fetch` per case) would be silently
 * ignored without this.
 */
export const fetchClientLayer = FetchHttpClient.layer.pipe(
  Layer.provide(
    Layer.succeed(FetchHttpClient.Fetch, ((...args: Parameters<typeof fetch>) =>
      globalThis.fetch(...args)) as typeof fetch),
  ),
);

/**
 * Effect client derived from `@dxos/edge-protocol`'s full `EdgeApi` `HttpApi` contract.
 * Replacement for the hand-written `EdgeHttpClient`; groups and endpoints are namespaced as
 * `client.<group>.<endpoint>(...)`. `@dxos/*` identity types (`SpaceId`, etc.) resolve to this
 * repo's workspace copies because `@dxos/edge-protocol` declares them as peer dependencies.
 */
export const makeEdgeApiClient = (baseUrl: string) =>
  HttpApiClient.make(EdgeApi, { baseUrl }).pipe(Effect.provide(fetchClientLayer), Effect.orDie);

export type EdgeApiClient = Effect.Success<ReturnType<typeof makeEdgeApiClient>>;

/**
 * Promise-based smoke-test helper for manually verifying the derived client against a live edge instance.
 */
export const checkEdgeApiHealth = (baseUrl: string): Promise<{ ok: true; service: string; env?: string }> =>
  Effect.gen(function* () {
    const client = yield* makeEdgeApiClient(baseUrl);
    const response = yield* client.status.health();
    return response.data;
  }).pipe(Effect.runPromise);
