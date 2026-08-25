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

import { RedeemOAuthRecovery } from './definitions';
import { beginOAuthFlow, createEdgeHttpClient } from './shared';

/**
 * Recover an existing identity by completing an OAuth flow with a registered recovery provider
 * (e.g. atproto / Atmosphere), using the redirect flow.
 *
 * Initiates the OAuth flow and opens the provider authorization URL away from the app. Because
 * atproto/bsky nullifies `window.opener`, kms-service finalizes via a top-level redirect to
 * `/redirect/oauth-recovery` (carrying the one-time `recoveryProof`) rather than a `postMessage`
 * relay. The recovery finalizer reads the proof — from the page it lands on in the browser, or
 * from the callback the shell relays on desktop — and redeems it via
 * `IdentityService.recoverIdentity` to admit this device into HALO. This operation returns as soon
 * as the auth page is open — it does not await completion.
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

      // The finalizer needs only the one-time `recoveryProof` carried in the redirect URL — no
      // localStorage snapshot is required for recovery (unlike register, which stashes the
      // invitation code + hub URL).
      log.info('redeeming OAuth recovery (redirect flow)', { provider, accessTokenId });

      yield* beginOAuthFlow(edgeClient, initiateRequest);
    }),
  ),
);

export default handler;
