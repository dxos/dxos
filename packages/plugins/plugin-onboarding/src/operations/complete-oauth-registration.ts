//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppSpace } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Context as DxContext } from '@dxos/context';
import { AccessToken } from '@dxos/cursor';
import { Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ATMOSPHERE_PROVIDER_ID, ATMOSPHERE_SOURCE, Connection } from '@dxos/plugin-connector';

import { CompleteOAuthRegistration } from './definitions';
import { createEdgeHttpClient } from './shared';

/**
 * Completes OAuth recovery registration for the local identity. Submits the registration token plus
 * the identity and space keys to edge, which routes the OAuth refresh token into the personal space
 * and records the recovery binding. On success, materializes an `AccessToken` object in the personal
 * space keyed by the returned `accessTokenId` so subsequent token rotations land on it.
 */
const handler: Operation.WithHandler<typeof CompleteOAuthRegistration> = CompleteOAuthRegistration.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (data) {
      const client = yield* Capability.get(ClientCapabilities.Client);

      const identity = client.halo.identity.get();
      invariant(identity, 'Cannot complete OAuth registration without a local identity.');
      const identityKey = identity.identityKey.toHex();

      const edgeClient = createEdgeHttpClient(client);

      const personalSpace = AppSpace.getPersonalSpace(client);
      invariant(personalSpace, 'Personal space not found.');
      const spaceKey = personalSpace.key.toHex();

      log.info('completing OAuth registration', { identityKey, spaceKey });

      const result = yield* Effect.tryPromise({
        try: () =>
          edgeClient.completeOAuthRegistration(DxContext.default(), {
            registrationToken: data.registrationToken,
            identityKey,
            spaceKey,
          }),
        catch: (error) =>
          new Error(`OAuth registration completion failed: ${error instanceof Error ? error.message : String(error)}`),
      });

      // Materialize the AccessToken object keyed by the returned id so rotated tokens can be written
      // back onto it; without it the stored refresh token is treated as orphaned and dropped.
      yield* Effect.promise(() => personalSpace.waitUntilReady());
      // OAuth recovery is atproto-only; the token belongs to the Atmosphere integration.
      const tokenObject = Obj.make(AccessToken.AccessToken, {
        id: result.accessTokenId,
        source: ATMOSPHERE_SOURCE,
        account: result.identifier,
        token: result.accessToken,
        scopes: result.scopes,
      });
      personalSpace.db.add(tokenObject);
      log.info('AccessToken ECHO object created', {
        id: result.accessTokenId,
        provider: result.provider,
        account: result.identifier,
      });

      // Wrap the AccessToken in a Connection so the connected account surfaces as a first-class
      // object in the personal space. Registration completes exactly once (first sign-up); login and
      // server-side token refresh never re-run this, so the AccessToken/Connection pair is created
      // unconditionally with no de-dup query.
      personalSpace.db.add(
        Connection.make({
          name: result.email ?? result.identifier,
          connectorId: ATMOSPHERE_PROVIDER_ID,
          accessToken: Ref.make(tokenObject),
        }),
      );
      log.info('Connection ECHO object created', { accessTokenId: result.accessTokenId, provider: result.provider });

      return { email: result.email };
    }),
  ),
);

export default handler;
