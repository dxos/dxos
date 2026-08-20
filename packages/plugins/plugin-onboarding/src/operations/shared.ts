//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as NativeOAuth from '@dxos/app-toolkit/NativeOAuth';
import { type Client } from '@dxos/client';
import { EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';

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
 * Open a provider's authorization page.
 *
 * The browser gets a new tab, which the post-auth redirect lands back in. The desktop app has no
 * tabs — WKWebView refuses `window.open` — so the shell hosts the page in a window of its own and
 * relays the redirect back to the running app instead (see `NativeOAuth`).
 */
export const openAuthPage = (authUrl: string): Effect.Effect<void, Error> =>
  NativeOAuth.supportsNativeOAuthWindow()
    ? Effect.tryPromise({
        try: () => NativeOAuth.openNativeOAuthWindow(authUrl, OAUTH_RECOVERY_REDIRECT_PATH),
        catch: (error) =>
          new Error(`Unable to open OAuth window: ${error instanceof Error ? error.message : String(error)}`),
      })
    : Effect.suspend(() =>
        window.open(authUrl, '_blank')
          ? Effect.void
          : Effect.fail(new Error('Unable to open OAuth recovery window (popup blocked?).')),
      );
