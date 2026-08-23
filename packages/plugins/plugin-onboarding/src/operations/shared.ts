//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as NativeOAuth from '@dxos/app-toolkit/NativeOAuth';
import { type Client } from '@dxos/client';
import { Context as DxContext } from '@dxos/context';
import { EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import { type InitiateOAuthFlowRequest } from '@dxos/protocols';

// atproto OAuth scopes for the recovery flows — shared with the Atmosphere integration provider.

/**
 * Create an `EdgeHttpClient` pointed at the configured edge URL. Extracted here
 * so all OAuth recovery operations share the same construction pattern.
 * TODO(wittjosiah): Use shared edge client.
 */
export const createEdgeHttpClient = (client: Client): EdgeHttpClient => {
  const edgeUrl = client.config.values.runtime?.services?.edge?.url;
  invariant(edgeUrl, 'Edge URL not configured.');
  return new EdgeHttpClient(edgeUrl);
};

/**
 * URL path Edge redirects to after an OAuth-recovery flow (account registration or identity
 * recovery) completes. atproto/bsky nullifies `window.opener`, so these flows can't use the
 * `postMessage` relay — kms-service always finalizes them via a top-level redirect to this path,
 * carrying the opaque `registrationToken` / `recoveryProof` (never the raw OAuth access token).
 * The recovery finalizer reads this path on app boot and completes the flow.
 */
export const OAUTH_RECOVERY_REDIRECT_PATH = '/redirect/oauth-recovery' as const;

const OAUTH_RECOVERY_PENDING_KEY_PREFIX = 'dxos:oauth-recovery-pending:' as const;

/**
 * `localStorage` key for the in-flight OAuth-recovery snapshot, keyed by `accessTokenId`. The
 * register flow persists the invitation code + hub URL here before opening the auth tab, since the
 * post-auth redirect reloads the app in a fresh tab and that React state would otherwise be lost.
 */
export const oauthRecoveryPendingKey = (
  accessTokenId: string,
): `${typeof OAUTH_RECOVERY_PENDING_KEY_PREFIX}${string}` => `${OAUTH_RECOVERY_PENDING_KEY_PREFIX}${accessTokenId}`;

/**
 * Persisted snapshot of an in-flight OAuth-recovery register flow (recovered after the redirect
 * reload). Only the register flow needs a snapshot; recovery carries everything it needs (the
 * one-time `recoveryProof`) in the redirect URL.
 */
export type OAuthRecoveryPendingSnapshot = {
  purpose: 'register';
  /** Invitation code to redeem (with the provider-verified email) once registration completes. */
  code: string;
  /** Hub-service URL the invitation code is redeemed against. */
  hubUrl: string;
};

/**
 * Begin an OAuth-recovery flow: ask EDGE for the provider's authorization URL and send the user to it.
 *
 * Returns once the page is open — completion arrives out of band, at
 * {@link OAUTH_RECOVERY_REDIRECT_PATH}.
 *
 * The two platforms diverge at the initiate call, not just at the opening. In the browser the app
 * calls EDGE itself and a new tab lands back on its own origin. On desktop the flow has to run in
 * the system browser (providers refuse embedded webviews), which means EDGE must redirect to the
 * shell's loopback server instead — and EDGE takes that target from the request's `Origin`, which
 * only Rust can set. So the shell issues the initiate call too.
 */
export const beginOAuthFlow = (
  edgeClient: EdgeHttpClient,
  request: InitiateOAuthFlowRequest,
): Effect.Effect<void, Error> =>
  NativeOAuth.supportsNativeOAuth()
    ? Effect.tryPromise({
        try: async () =>
          NativeOAuth.startNativeOAuth({
            edgeUrl: edgeClient.baseUrl,
            provider: request.provider,
            scopes: [...request.scopes],
            spaceId: request.spaceId,
            accessTokenId: request.accessTokenId,
            authHeader: await edgeClient.getAuthHeader(),
            ...(request.purpose ? { purpose: request.purpose } : {}),
            ...(request.registerRecovery ? { registerRecovery: request.registerRecovery } : {}),
            ...(request.loginHint ? { loginHint: request.loginHint } : {}),
          }),
        catch: (error) =>
          new Error(`Unable to start OAuth flow: ${error instanceof Error ? error.message : String(error)}`),
      })
    : Effect.gen(function* () {
        const { authUrl } = yield* Effect.tryPromise({
          try: () => edgeClient.initiateOAuthFlow(DxContext.default(), request),
          catch: (error) =>
            new Error(`OAuth initiate failed: ${error instanceof Error ? error.message : String(error)}`),
        });
        // A null return means the popup was blocked — fail rather than silently continue, since the
        // flow can never complete.
        if (!window.open(authUrl, '_blank')) {
          return yield* Effect.fail(new Error('Unable to open OAuth recovery window (popup blocked?).'));
        }
      });
