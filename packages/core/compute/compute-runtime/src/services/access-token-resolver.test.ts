//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { Credential } from '@dxos/compute';
import { EffectEx } from '@dxos/effect';
import { SpaceId } from '@dxos/keys';
import { type EdgeFunctionEnv } from '@dxos/protocols';

import { accessTokenResolverFromService } from './access-token-resolver';

const SPACE_ID = SpaceId.random();

/** Stub binding recording the requests it received; the real one is bound to a single space. */
const makeService = (results: EdgeFunctionEnv.GetAccessTokenResult[]) => {
  const requests: string[] = [];
  const service: EdgeFunctionEnv.AccessTokenService = {
    getAccessToken: async (_ctx, { accessTokenId }) => {
      requests.push(accessTokenId);
      return (results.shift() ?? { success: false, reason: 'exhausted' }) as any;
    },
  };
  return { requests, service };
};

const resolve = (service: EdgeFunctionEnv.AccessTokenService, options: { refresh?: boolean } = {}) =>
  Credential.AccessTokenResolver.resolve({ spaceId: SPACE_ID, accessTokenId: 'token-1', ...options }).pipe(
    Effect.provide(accessTokenResolverFromService(service)),
  );

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

  test('surfaces a failed resolution instead of returning a placeholder', async ({ expect }) => {
    const { service } = makeService([{ success: false, reason: 'not_found' }]);

    await expect(EffectEx.runPromise(resolve(service))).rejects.toThrow(/not_found/);
  });
});
