//
// Copyright 2026 DXOS.org
//

import * as Layer from 'effect/Layer';

import { Credential } from '@dxos/compute';
import { Context as DxContext } from '@dxos/context';
import { type EdgeHttpClient } from '@dxos/edge-client';
import { log } from '@dxos/log';

/**
 * Slack the cache allows against the server's expiry, covering clock skew plus the lifetime of a
 * request that took the token just before it lapsed.
 */
const EXPIRY_SKEW_MS = 60_000;

type CacheEntry = { accessToken: string; expiresAtMillis: number };

/**
 * {@link Credential.AccessTokenResolver} backed by EDGE's `/oauth/token`.
 *
 * Tokens are cached per `accessTokenId` until shortly before they expire, so a sync that makes many
 * API calls costs one round-trip rather than one per call. `refresh` evicts first, which is how a
 * caller recovers from a token that was revoked before its stated expiry.
 */
export const accessTokenResolverFromEdge = (getEdgeClient: () => EdgeHttpClient) =>
  Layer.sync(Credential.AccessTokenResolver, () => {
    const cache = new Map<string, CacheEntry>();

    return {
      resolve: async ({ spaceId, accessTokenId, refresh }) => {
        if (refresh) {
          cache.delete(accessTokenId);
        }

        const cached = cache.get(accessTokenId);
        if (cached && cached.expiresAtMillis - Date.now() > EXPIRY_SKEW_MS) {
          return cached.accessToken;
        }

        const response = await getEdgeClient().getAccessToken(DxContext.default(), { spaceId, accessTokenId });
        cache.set(accessTokenId, response);
        log('resolved managed access token', { accessTokenId, expiresAtMillis: response.expiresAtMillis });
        return response.accessToken;
      },
    };
  });
