//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { getPersonalSpace } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Context as DxContext } from '@dxos/context';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { OAuthProvider } from '@dxos/protocols';
import { AccessToken } from '@dxos/types';

import { CompleteOAuthRegistration } from './definitions';
import { createEdgeHttpClient } from './shared';

/**
 * Maps OAuth provider to the value stored as `AccessToken.source`. atproto accounts are portable —
 * the PDS and handle can change over the account's lifetime — so we don't pin to a PDS hostname.
 * TODO(wittjosiah): This is currently required to be a hostname. Loosen requirements?
 */
const SOURCE_BY_PROVIDER: Record<string, string> = {
  [OAuthProvider.GOOGLE]: 'google.com',
  [OAuthProvider.ATPROTO]: 'atproto.local',
};

/**
 * Phase 2 of OAuth-first recovery registration.
 *
 * Requires an existing local identity (created after phase 1 authenticated the user). Submits
 * `{ registrationToken, identityKey, spaceKey }` so kms-service can route the stashed OAuth
 * refresh token into the personal space and write the IdentityRecovery row. The spaceKey is a
 * routing hint, not a security boundary — kms-service does not verify identityKey↔spaceKey
 * ownership cryptographically; SpaceSecretsObject access is gated by space membership server-side.
 *
 * On success kms-service returns the initial access token. We materialize an AccessToken ECHO
 * object in the personal space with `id = accessTokenId` so the kms-service refresh cron can later
 * write rotated access tokens onto it (it looks the object up by id via `_queryTokenObjects`).
 */
const handler: Operation.WithHandler<typeof CompleteOAuthRegistration> = CompleteOAuthRegistration.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (data) {
      const client = yield* Capability.get(ClientCapabilities.Client);

      const identity = client.halo.identity.get();
      invariant(identity, 'Cannot complete OAuth registration without a local identity.');
      const identityKey = identity.identityKey.toHex();

      const edgeClient = createEdgeHttpClient(client);

      const personalSpace = getPersonalSpace(client);
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

      // Materialize the AccessToken ECHO object so kms-service's refresh cron can find it by id.
      // Without this, the first cron tick logs "AccessToken object was deleted" and unregisters
      // the refresh token.
      yield* Effect.promise(() => personalSpace.waitUntilReady());
      const source = SOURCE_BY_PROVIDER[result.provider] ?? result.provider;
      const tokenObject = Obj.make(AccessToken.AccessToken, {
        id: result.accessTokenId,
        source,
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

      return { email: result.email };
    }),
  ),
);

export default handler;
