//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { getPersonalSpace } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Context as DxContext } from '@dxos/context';
import { Filter, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ATPROTO_PROVIDER_ID, ATPROTO_SOURCE, Integration } from '@dxos/plugin-integration';
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
  [OAuthProvider.ATPROTO]: ATPROTO_SOURCE,
};

/**
 * Maps OAuth provider to the `Integration.providerId` for the wrapping Integration. atproto routes
 * to the default credential-only atproto provider (no sync). Providers without a default integration
 * provider leave `providerId` unset.
 */
const PROVIDER_ID_BY_PROVIDER: Record<string, string> = {
  [OAuthProvider.ATPROTO]: ATPROTO_PROVIDER_ID,
};

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

      // Materialize the AccessToken object keyed by the returned id so rotated tokens can be written
      // back onto it; without it the stored refresh token is treated as orphaned and dropped.
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

      // Wrap the AccessToken in an Integration so the connected account surfaces as a first-class
      // object in the personal space. De-dup against prior logins/recovery: the AccessToken id is
      // stable across re-registration, so only create the Integration if one doesn't already
      // reference this token.
      const integrations = yield* Effect.promise(() =>
        personalSpace.db.query(Filter.type(Integration.Integration)).run(),
      );
      const alreadyWrapped = integrations.some(
        (integration) => integration.accessToken.target?.id === result.accessTokenId,
      );
      if (!alreadyWrapped) {
        personalSpace.db.add(
          Integration.make({
            name: result.email ?? result.identifier,
            providerId: PROVIDER_ID_BY_PROVIDER[result.provider],
            accessToken: Ref.make(tokenObject),
            targets: [],
          }),
        );
        log.info('Integration ECHO object created', { accessTokenId: result.accessTokenId, provider: result.provider });
      }

      return { email: result.email };
    }),
  ),
);

export default handler;
