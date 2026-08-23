//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { EntityId, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { ATPROTO_OAUTH_SCOPES, type InitiateOAuthFlowRequest, OAuthProvider } from '@dxos/protocols';

import { RegisterOAuthRecovery } from './definitions';
import { beginOAuthFlow, createEdgeHttpClient, oauthRecoveryPendingKey } from './shared';

/**
 * Begins OAuth recovery registration (redirect flow).
 *
 * Initiates the OAuth flow and opens the provider authorization URL away from the app. Because
 * atproto/bsky nullifies `window.opener`, kms-service finalizes via a top-level redirect to
 * `/redirect/oauth-recovery` rather than a `postMessage` relay. In the browser that redirect
 * reloads the app in a fresh tab, so the invitation code + hub URL needed to complete registration
 * are persisted to `localStorage` (keyed by `accessTokenId`) here and read back by the recovery
 * finalizer. This operation returns as soon as the auth page is open — it does not await
 * completion.
 */
const handler: Operation.WithHandler<typeof RegisterOAuthRecovery> = RegisterOAuthRecovery.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (data) {
      const client = yield* Capability.get(ClientCapabilities.Client);

      const provider = data.provider as OAuthProvider;
      const edgeClient = createEdgeHttpClient(client);
      // The recovery finalizer creates an AccessToken ECHO object in the default space under this
      // id, so it must be a valid object id.
      const accessTokenId = EntityId.random();

      const initiateRequest: InitiateOAuthFlowRequest = {
        provider,
        spaceId: SpaceId.random(),
        accessTokenId,
        scopes: [...ATPROTO_OAUTH_SCOPES],
        purpose: 'register',
        registerRecovery: true,
        // atproto requires a login hint (handle or DID) to resolve the user's PDS/auth server.
        ...(data.loginHint ? { loginHint: data.loginHint } : {}),
      };

      // Persist what the finalizer needs to complete registration after the redirect reload.
      yield* Effect.try(() =>
        localStorage.setItem(
          oauthRecoveryPendingKey(accessTokenId),
          JSON.stringify({ purpose: 'register', code: data.code, hubUrl: data.hubUrl }),
        ),
      ).pipe(
        // Persisting the snapshot is required for the finalizer to complete registration after the
        // redirect reload; if it fails, log and abort before opening the auth tab rather than
        // stranding the user mid-flow.
        Effect.tapError((error) =>
          Effect.sync(() => log.warn('failed to persist OAuth recovery registration snapshot', { error })),
        ),
      );

      log.info('registering OAuth recovery (redirect flow)', { provider, accessTokenId });

      yield* beginOAuthFlow(edgeClient, initiateRequest);
    }),
  ),
);

export default handler;
