//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Context as DxContext } from '@dxos/context';
import { EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import { ObjectId, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type InitiateOAuthFlowRequest, OAuthProvider } from '@dxos/protocols';

import { oauthRecoveryPendingKey } from '../constants';
import { ClientCapabilities } from '../types';
import { RegisterOAuthRecovery } from './definitions';

/** Scopes requested during atproto OAuth registration. `transition:generic` gives the full
 * offline-access token that can be used for space operations after registration. */
const ATPROTO_SCOPES = ['atproto', 'transition:generic', 'transition:email'];

/**
 * Phase 1 of OAuth-first recovery registration (redirect flow).
 *
 * Initiates the OAuth flow and opens the provider authorization URL in a new tab. Because
 * atproto/bsky nullifies `window.opener`, kms-service finalizes via a top-level redirect to
 * `/redirect/oauth-recovery` rather than a `postMessage` relay. The redirect reloads the app in a
 * fresh tab, so the invitation code + hub URL needed to complete registration are persisted to
 * `localStorage` (keyed by `accessTokenId`) here, and the recovery finalizer reads them back on
 * boot. This operation returns as soon as the auth tab is open — it does not await completion.
 */
const handler: Operation.WithHandler<typeof RegisterOAuthRecovery> = RegisterOAuthRecovery.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (data) {
      const client = yield* Capability.get(ClientCapabilities.Client);

      const edgeUrl = client.config.values.runtime?.services?.edge?.url;
      invariant(edgeUrl, 'Edge URL not configured.');

      const provider = data.provider as OAuthProvider;
      const edgeClient = new EdgeHttpClient(edgeUrl);
      // accessTokenId doubles as: (a) the cron id in SpaceSecretsObject (≤26 chars for the
      // scheduled-run storage key) and (b) the ECHO id of the AccessToken object the recovery
      // finalizer creates in the personal space. ULIDs satisfy both — they are exactly 26 chars
      // and a valid ECHO ObjectId.
      const accessTokenId = ObjectId.random();

      const initiateRequest: InitiateOAuthFlowRequest & {
        purpose: 'register';
        registerRecovery: true;
      } = {
        provider,
        spaceId: SpaceId.random(),
        accessTokenId,
        scopes: ATPROTO_SCOPES,
        purpose: 'register',
        registerRecovery: true,
        // atproto requires a login hint (handle or DID) to resolve the user's PDS/auth server.
        ...(data.loginHint ? { loginHint: data.loginHint } : {}),
      };

      const initiateResponse = yield* Effect.tryPromise({
        try: () => edgeClient.initiateOAuthFlow(DxContext.default(), initiateRequest),
        catch: (error) => new Error(`OAuth initiate failed: ${error instanceof Error ? error.message : String(error)}`),
      });

      // Persist what the finalizer needs to complete registration after the redirect reload.
      yield* Effect.try(() =>
        localStorage.setItem(
          oauthRecoveryPendingKey(accessTokenId),
          JSON.stringify({ purpose: 'register', code: data.code, hubUrl: data.hubUrl }),
        ),
      ).pipe(
        Effect.catchAll((error) => Effect.sync(() => log.warn('failed to persist OAuth recovery registration snapshot', { error }))),
      );

      log.info('registering OAuth recovery (redirect flow)', { provider, accessTokenId });

      // Open the auth URL in a new tab. After auth, kms-service redirects the tab to
      // `/redirect/oauth-recovery`, where the recovery finalizer takes over.
      yield* Effect.sync(() => {
        window.open(initiateResponse.authUrl, '_blank');
      });
    }),
  ),
);

export default handler;
