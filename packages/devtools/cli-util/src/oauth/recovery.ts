//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { EntityId, SpaceId } from '@dxos/keys';

import { OAUTH_TIMEOUT_MS, startOAuthCallbackServer } from './server';

/** Path Edge redirects the browser to after a recovery/register OAuth round-trip. */
const RECOVERY_CALLBACK_PATH = '/redirect/oauth-recovery';

export type RecoveryOAuthParams = {
  /** Edge services base URL (from client config `runtime.services.edge.url`). */
  readonly edgeBaseUrl: string;
  /** OAuth provider id (e.g. `'atproto'`). */
  readonly provider: string;
  /** Requested scopes. */
  readonly scopes: readonly string[];
  /** atproto handle or DID — required so Edge can resolve the user's PDS / auth server. */
  readonly loginHint: string;
};

type InitiateEnvelope = { success: boolean; data?: { authUrl?: string }; error?: { message?: string } };

/**
 * Drives the gate's OAuth identity-recovery flow from a CLI: starts a local callback server, asks
 * Edge to begin a `recovery`-purpose OAuth flow (advertising the local server as the redirect
 * origin via the `Origin` header), opens the browser, and resolves with the one-time
 * `recoveryProof` Edge carries back in its redirect. The caller redeems the proof via
 * `client.halo.recoverIdentity({ recoveryProof })`.
 *
 * Recovery runs before any identity exists, so no auth header is sent — Edge resolves the user's
 * space / token server-side from the recovery binding, and the `spaceId` / `accessTokenId` in the
 * request are unused (random values satisfy request validation).
 */
export const performRecoveryOAuthFlow = Effect.fn(function* (params: RecoveryOAuthParams) {
  const server = yield* startOAuthCallbackServer(RECOVERY_CALLBACK_PATH);
  return yield* Effect.gen(function* () {
    const initiateUrl = new URL('/oauth/initiate', params.edgeBaseUrl).toString();
    const response = yield* Effect.tryPromise({
      try: () =>
        fetch(initiateUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Origin': server.origin },
          body: JSON.stringify({
            provider: params.provider,
            scopes: params.scopes,
            spaceId: SpaceId.random(),
            accessTokenId: EntityId.random(),
            purpose: 'recovery',
            loginHint: params.loginHint,
          }),
        }),
      catch: (error) =>
        new Error(`OAuth initiate request failed: ${error instanceof Error ? error.message : String(error)}`),
    });

    const envelope = yield* Effect.tryPromise({
      try: () => response.json() as Promise<InitiateEnvelope>,
      catch: (error) => new Error(`OAuth initiate response parse failed: ${String(error)}`),
    });
    if (!envelope.success || !envelope.data?.authUrl) {
      return yield* Effect.fail(new Error(`OAuth initiation failed: ${envelope.error?.message ?? 'unknown error'}`));
    }

    yield* server.open(envelope.data.authUrl);
    const callbackParams = yield* server.waitForResult(OAUTH_TIMEOUT_MS);
    const recoveryProof = callbackParams.recoveryProof;
    if (!recoveryProof) {
      return yield* Effect.fail(new Error('OAuth recovery completed but no recoveryProof was returned.'));
    }
    return { recoveryProof };
  }).pipe(Effect.ensuring(server.stop()));
});
