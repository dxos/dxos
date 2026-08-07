//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as Credential from '@dxos/compute/Credential';
import { EdgeHttpClient } from '@dxos/edge-client';
import { EffectEx } from '@dxos/effect';
import { SpaceId } from '@dxos/keys';
import { type EdgeFunctionEnv } from '@dxos/protocols';

import { accessTokenResolverFromEdge, accessTokenResolverFromService } from './access-token-resolver';

const SPACE_ID = SpaceId.random();

describe('accessTokenResolverFromService', () => {
  test('resolves through the binding', async ({ expect }) => {
    const { requests, service } = makeService([
      { success: true, accessToken: 'live-token', expiresAtMillis: Date.now() + 3_600_000 },
    ]);

    expect(await EffectEx.runPromise(resolve(service))).toEqual('live-token');
    expect(requests).toEqual(['token-1']);
  });

  test('caches so a sync making many calls costs one round-trip', async ({ expect }) => {
    const { requests, service } = makeService([
      { success: true, accessToken: 'live-token', expiresAtMillis: Date.now() + 3_600_000 },
    ]);
    const layer = accessTokenResolverFromService(service);

    await EffectEx.runPromise(
      Effect.gen(function* () {
        yield* Credential.AccessTokenResolver.resolve({ spaceId: SPACE_ID, accessTokenId: 'token-1' });
        yield* Credential.AccessTokenResolver.resolve({ spaceId: SPACE_ID, accessTokenId: 'token-1' });
      }).pipe(Effect.provide(layer)),
    );

    expect(requests).toEqual(['token-1']);
  });

  test('refetches a token already at expiry rather than serving it', async ({ expect }) => {
    const { requests, service } = makeService([
      // Inside the skew window, so the cache must not satisfy the second read from it.
      { success: true, accessToken: 'stale-token', expiresAtMillis: Date.now() + 1_000 },
      { success: true, accessToken: 'fresh-token', expiresAtMillis: Date.now() + 3_600_000 },
    ]);
    const layer = accessTokenResolverFromService(service);

    const second = await EffectEx.runPromise(
      Effect.gen(function* () {
        yield* Credential.AccessTokenResolver.resolve({ spaceId: SPACE_ID, accessTokenId: 'token-1' });
        return yield* Credential.AccessTokenResolver.resolve({ spaceId: SPACE_ID, accessTokenId: 'token-1' });
      }).pipe(Effect.provide(layer)),
    );

    expect(second).toEqual('fresh-token');
    expect(requests).toEqual(['token-1', 'token-1']);
  });

  test('does not serve one space a token cached for another', async ({ expect }) => {
    // The EDGE-backed layer is application-scoped, so a cache hit skips EDGE's membership check —
    // the key must include the space or the second read would return the first space's token.
    const other = SpaceId.random();
    const calls: { spaceId: string; accessTokenId: string }[] = [];
    const edge = new EdgeHttpClient('https://edge.example.com');
    edge.getAccessToken = async (_ctx, { spaceId, accessTokenId }) => {
      calls.push({ spaceId, accessTokenId });
      return { accessToken: `token-for-${spaceId}`, expiresAtMillis: Date.now() + 3_600_000 };
    };

    const resolved = await EffectEx.runPromise(
      Effect.gen(function* () {
        const first = yield* Credential.AccessTokenResolver.resolve({ spaceId: SPACE_ID, accessTokenId: 'shared-id' });
        const second = yield* Credential.AccessTokenResolver.resolve({ spaceId: other, accessTokenId: 'shared-id' });
        return { first, second };
      }).pipe(Effect.provide(accessTokenResolverFromEdge(() => edge))),
    );

    expect(resolved.first).toEqual(`token-for-${SPACE_ID}`);
    expect(resolved.second).toEqual(`token-for-${other}`);
    expect(calls).toHaveLength(2);
  });

  test('surfaces a failed resolution instead of returning a placeholder', async ({ expect }) => {
    const { service } = makeService([{ success: false, reason: 'not_found' }]);

    await expect(EffectEx.runPromise(resolve(service))).rejects.toThrow(/not_found/);
  });
});

/** Stub binding recording the requests it received; the real one is bound to a single space. */
const makeService = (results: EdgeFunctionEnv.GetAccessTokenResult[]) => {
  const requests: string[] = [];
  const exhausted: EdgeFunctionEnv.GetAccessTokenResult = { success: false, reason: 'exhausted' };
  const service: EdgeFunctionEnv.AccessTokenService = {
    getAccessToken: async (_ctx, { accessTokenId }) => {
      requests.push(accessTokenId);
      // Workers RPC attaches a disposer to every returned object; the stub mirrors that shape.
      return { ...(results.shift() ?? exhausted), [Symbol.dispose]: () => {} };
    },
  };
  return { requests, service };
};

const resolve = (service: EdgeFunctionEnv.AccessTokenService, options: { refresh?: boolean } = {}) =>
  Credential.AccessTokenResolver.resolve({ spaceId: SPACE_ID, accessTokenId: 'token-1', ...options }).pipe(
    Effect.provide(accessTokenResolverFromService(service)),
  );
