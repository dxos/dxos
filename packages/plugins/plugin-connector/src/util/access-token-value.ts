//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Client } from '@dxos/client';
import { Context as DxContext } from '@dxos/context';
import { Obj } from '@dxos/echo';
import { type AccessToken } from '@dxos/link';
import { isManagedAccessToken } from '@dxos/protocols';

/**
 * The usable value of an {@link AccessToken.AccessToken}: the stored string, or — when the token is
 * server-custodied and the object holds only a placeholder — the live token fetched from EDGE.
 *
 * For one-shot probes (`testConnection`, `onTokenCreated`). Sync paths resolve through
 * `Credential.AccessTokenResolver` instead, which caches across the many calls a sync run makes.
 */
export const resolveAccessTokenValue = (
  client: Client,
  accessToken: AccessToken.AccessToken,
): Effect.Effect<string, Error> =>
  Effect.gen(function* () {
    if (!isManagedAccessToken(accessToken.token)) {
      return accessToken.token;
    }

    const spaceId = Obj.getDatabase(accessToken)?.spaceId;
    if (!spaceId) {
      return yield* Effect.fail(new Error('Cannot resolve a managed access token that is not bound to a space.'));
    }

    const response = yield* Effect.tryPromise({
      try: () => client.edge.http.getAccessToken(DxContext.default(), { spaceId, accessTokenId: accessToken.id }),
      catch: (error) => (error instanceof Error ? error : new Error(String(error))),
    });
    return response.accessToken;
  });
