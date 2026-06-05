//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Context as DxContext } from '@dxos/context';
import { EntityId, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { type InitiateOAuthFlowRequest, OAuthProvider } from '@dxos/protocols';

import { RedeemOAuthRecovery } from './definitions';
import { ATPROTO_OAUTH_SCOPES, createEdgeHttpClient } from './shared';

/**
 * Recover an existing identity by completing an OAuth flow with a registered recovery provider
 * (e.g. atproto / Atmosphere), using the redirect flow.
 *
 * Initiates the OAuth flow and opens the provider authorization URL in a new tab. Because
 * atproto/bsky nullifies `window.opener`, kms-service finalizes via a top-level redirect to
 * `/redirect/oauth-recovery` (carrying the one-time `recoveryProof`) rather than a `postMessage`
 * relay. The recovery finalizer reads the proof on boot and redeems it via
 * `IdentityService.recoverIdentity` to admit this device into HALO. This operation returns as soon
 * as the auth tab is open — it does not await completion.
 */
const handler: Operation.WithHandler<typeof RedeemOAuthRecovery> = RedeemOAuthRecovery.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (data) {
      const client = yield* Capability.get(ClientCapabilities.Client);

      const provider = data.provider as OAuthProvider;
      const edgeClient = createEdgeHttpClient(client);
      // The recovery flow does not consume these — the user's space/token are resolved server-side
      // from the recovery binding. Random values satisfy InitiateOAuthFlowRequest validation.
      const accessTokenId = EntityId.random();

      const initiateRequest: InitiateOAuthFlowRequest = {
        provider,
        spaceId: SpaceId.random(),
        accessTokenId,
        scopes: [...ATPROTO_OAUTH_SCOPES],
        purpose: 'recovery',
        // atproto requires a login hint (handle or DID) to resolve the user's PDS/auth server.
        ...(data.loginHint ? { loginHint: data.loginHint } : {}),
      };

      const initiateResponse = yield* Effect.tryPromise({
        try: () => edgeClient.initiateOAuthFlow(DxContext.default(), initiateRequest),
        catch: (error) => new Error(`OAuth initiate failed: ${error instanceof Error ? error.message : String(error)}`),
      });

      // The finalizer needs only the one-time `recoveryProof` carried in the redirect URL — no
      // localStorage snapshot is required for recovery (unlike register, which stashes the
      // invitation code + hub URL).
      log.info('redeeming OAuth recovery (redirect flow)', { provider, accessTokenId });

      // Open the auth URL in a new tab. After auth, kms-service redirects the tab to
      // `/redirect/oauth-recovery`, where the recovery finalizer redeems the proof. A null return
      // means the popup was blocked — fail rather than silently continue (the flow can never
      // complete).
      const authWindow = yield* Effect.sync(() => window.open(initiateResponse.authUrl, '_blank'));
      if (!authWindow) {
        return yield* Effect.fail(new Error('Unable to open OAuth recovery window (popup blocked?).'));
      }
    }),
  ),
);

export default handler;
