//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Context } from '@dxos/context';
import { Operation } from '@dxos/compute';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type InitiateOAuthFlowRequest, type InitiateOAuthFlowResponse, OAuthProvider } from '@dxos/protocols';

import { ClientCapabilities } from '../types';
import { RedeemOAuthRecovery } from './definitions';

const RECOVER_IDENTITY_RPC_TIMEOUT = 30_000;
const OAUTH_POPUP_TIMEOUT = 5 * 60_000;

/** Default scope set per provider — enough to identify the user without granting broad access. */
const SCOPES_BY_PROVIDER: Record<string, string[]> = {
  [OAuthProvider.GOOGLE]: ['openid', 'email'],
  [OAuthProvider.ATPROTO]: ['atproto', 'transition:email'],
};

const handler: Operation.WithHandler<typeof RedeemOAuthRecovery> = RedeemOAuthRecovery.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (data) {
      const client = yield* Capability.get(ClientCapabilities.Client);
      invariant(client.services.services.IdentityService, 'IdentityService not available');

      const edgeUrl = client.config.values.runtime?.services?.edge?.url;
      invariant(edgeUrl, 'Edge URL not configured.');

      const provider = data.provider as OAuthProvider;
      const scopes = SCOPES_BY_PROVIDER[provider] ?? ['openid'];
      const httpEndpoint = toHttpUrl(edgeUrl);

      // 1. Initiate the OAuth flow. spaceId/accessTokenId are placeholders — kms-service
      //    overwrites spaceId from the IdentityRecovery row once it identifies the user, and
      //    accessTokenId is irrelevant on a fresh device.
      const initiateRequest: InitiateOAuthFlowRequest & { purpose: 'recovery' } = {
        provider,
        spaceId: SpaceId.random(),
        accessTokenId: `recovery-${crypto.randomUUID()}`,
        scopes,
        purpose: 'recovery',
      };

      const initiateResponse = yield* Effect.tryPromise({
        try: () => initiateOAuthFlow(httpEndpoint, initiateRequest),
        catch: (error) => new Error(`OAuth initiate failed: ${error instanceof Error ? error.message : String(error)}`),
      });

      // 2. Open the auth URL in a popup and wait for the redirect page to postMessage the
      //    recoveryProof back to this window.
      const recoveryProof = yield* Effect.tryPromise({
        try: () => waitForRecoveryProof(initiateResponse.authUrl, httpEndpoint),
        catch: (error) =>
          new Error(`OAuth recovery cancelled or failed: ${error instanceof Error ? error.message : String(error)}`),
      });

      log.info('redeeming OAuth recovery proof');

      // 3. Submit the proof to db-service via the existing IdentityService.recoverIdentity RPC,
      //    which routes proof requests to recoverIdentityWithOAuthProof on the client-services
      //    side and admits the new device into HALO.
      yield* Effect.promise(() =>
        client.services.services.IdentityService!.recoverIdentity(
          { recoveryProof },
          { timeout: RECOVER_IDENTITY_RPC_TIMEOUT },
        ),
      );
    }),
  ),
);

export default handler;

/** Convert a ws(s):// edge URL to http(s):// for HTTP API calls. */
const toHttpUrl = (url: string): string => url.replace(/^wss?:/, (match) => (match === 'wss:' ? 'https:' : 'http:'));

const initiateOAuthFlow = async (endpoint: string, request: unknown): Promise<InitiateOAuthFlowResponse> => {
  const response = await fetch(`${endpoint.replace(/\/$/, '')}/oauth/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  const envelope = (await response.json()) as
    | { success: true; data: InitiateOAuthFlowResponse }
    | { success: false; error?: { message?: string } };
  if (!envelope.success) {
    throw new Error(envelope.error?.message ?? 'OAuth initiate failed');
  }
  return envelope.data;
};

/**
 * Open the OAuth provider authorization URL in a popup window and wait for the kms-service
 * redirect page to postMessage back with the result. The redirect page already postMessages
 * `{ ...oauthResult, recoveryProof }` to `window.opener` (see kms-service redirect-page.ts).
 */
const waitForRecoveryProof = (authUrl: string, expectedOrigin: string): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const popup = window.open(authUrl, 'dxos-oauth-recovery', 'width=520,height=720');
    if (!popup) {
      reject(new Error('Failed to open OAuth popup — popup blocker?'));
      return;
    }

    const ctx = Context.default();
    const expectedOriginUrl = new URL(expectedOrigin);

    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      clearInterval(pollClosed);
      clearTimeout(timeoutHandle);
      void ctx.dispose();
    };

    const onMessage = (event: MessageEvent) => {
      // Trust only messages from the kms-service origin (or same-origin localhost during dev).
      if (event.origin !== expectedOriginUrl.origin && event.origin !== window.location.origin) {
        return;
      }
      const data = event.data as { success?: boolean; recoveryProof?: string; reason?: string };
      if (typeof data !== 'object' || data === null || typeof data.success !== 'boolean') {
        return;
      }
      cleanup();
      if (data.success && data.recoveryProof) {
        resolve(data.recoveryProof);
      } else {
        reject(new Error(data.reason ?? 'OAuth flow did not return a recovery proof'));
      }
    };

    window.addEventListener('message', onMessage);

    // Detect user-closed popup.
    const pollClosed = setInterval(() => {
      if (popup.closed) {
        cleanup();
        reject(new Error('OAuth popup closed before completing'));
      }
    }, 500);

    const timeoutHandle = setTimeout(() => {
      cleanup();
      try {
        popup.close();
      } catch {
        // Ignore — popup may already be closed.
      }
      reject(new Error('OAuth flow timed out'));
    }, OAUTH_POPUP_TIMEOUT);
  });
};
