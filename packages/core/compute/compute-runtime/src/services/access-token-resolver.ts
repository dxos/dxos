//
// Copyright 2026 DXOS.org
//

import * as Layer from 'effect/Layer';

import { Credential } from '@dxos/compute';
import { Context as DxContext } from '@dxos/context';
import { type EdgeHttpClient } from '@dxos/edge-client';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type EdgeFunctionEnv } from '@dxos/protocols';

/**
 * Slack the cache allows against the server's expiry, covering clock skew plus the lifetime of a
 * request that took the token just before it lapsed.
 */
const EXPIRY_SKEW_MS = 60_000;

type CacheEntry = { accessToken: string; expiresAtMillis: number };

/**
 * {@link Credential.AccessTokenResolver} backed by the EDGE-side binding a function is invoked with.
 *
 * Server-side counterpart to {@link accessTokenResolverFromEdge}: a function context has no identity
 * to sign a presentation with, so resolution goes through a service binding instead of HTTP. The
 * binding is already bound to the invocation's space, so `spaceId` is not forwarded — a function
 * cannot reach another space's credentials by asking for them.
 */
export const accessTokenResolverFromService = (service: EdgeFunctionEnv.AccessTokenService) =>
  Layer.sync(Credential.AccessTokenResolver, () => {
    const cache = new Map<string, CacheEntry>();

    return {
      resolve: async ({ accessTokenId, refresh }) => {
        if (refresh) {
          cache.delete(accessTokenId);
        }

        const cached = cache.get(accessTokenId);
        if (cached && cached.expiresAtMillis - Date.now() > EXPIRY_SKEW_MS) {
          return cached.accessToken;
        }

        const result = await service.getAccessToken({}, { accessTokenId });
        if (!result.success) {
          throw new Error(`Could not resolve managed access token ${accessTokenId}: ${result.reason}`);
        }
        cache.set(accessTokenId, { accessToken: result.accessToken, expiresAtMillis: result.expiresAtMillis });
        log('resolved managed access token via service binding', {
          accessTokenId,
          expiresAtMillis: result.expiresAtMillis,
        });
        return result.accessToken;
      },
    };
  });

/**
 * {@link Credential.AccessTokenResolver} backed by EDGE's `/oauth/token`.
 *
 * Tokens are cached per `accessTokenId` until shortly before they expire, so a sync that makes many
 * API calls costs one round-trip rather than one per call. `refresh` evicts first, which is how a
 * caller recovers from a token that was revoked before its stated expiry. The client is resolved
 * lazily so nothing touches EDGE unless a managed token is actually read.
 */
export const accessTokenResolverFromEdge = (getEdgeClient: () => EdgeHttpClient) =>
  Layer.sync(Credential.AccessTokenResolver, () => {
    const cache = new Map<string, CacheEntry>();
    // Keyed by space as well as token, because this layer is application-scoped: a cache hit is
    // served without EDGE re-checking membership, so a key that ignored the space would let one
    // space's members read a token resolved for another.
    const cacheKey = (spaceId: SpaceId, accessTokenId: string) => `${spaceId}:${accessTokenId}`;

    return {
      resolve: async ({ spaceId, accessTokenId, refresh }) => {
        const key = cacheKey(spaceId, accessTokenId);
        if (refresh) {
          cache.delete(key);
        }

        const cached = cache.get(key);
        if (cached && cached.expiresAtMillis - Date.now() > EXPIRY_SKEW_MS) {
          return cached.accessToken;
        }

        const response = await getEdgeClient().getAccessToken(DxContext.default(), { spaceId, accessTokenId });
        cache.set(key, response);
        log('resolved managed access token', { accessTokenId, expiresAtMillis: response.expiresAtMillis });
        return response.accessToken;
      },
    };
  });
