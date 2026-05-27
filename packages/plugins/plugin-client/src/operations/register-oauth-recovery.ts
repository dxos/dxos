//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { getPersonalSpace } from '@dxos/app-toolkit';
import { Context } from '@dxos/context';
import { Operation } from '@dxos/compute';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type InitiateOAuthFlowRequest, type InitiateOAuthFlowResponse, OAuthProvider } from '@dxos/protocols';

import { ClientCapabilities } from '../types';
import { plainCredentialToBase64 } from './credential-codec';
import { RegisterOAuthRecovery } from './definitions';

const OAUTH_POPUP_TIMEOUT = 5 * 60_000;

const SPACE_GENESIS_CREDENTIAL_TYPE = 'dxos.halo.credentials.SpaceGenesis';

/** Default scope set per provider — enough to identify the user and read a verified email. */
const SCOPES_BY_PROVIDER: Record<string, string[]> = {
  [OAuthProvider.GOOGLE]: ['openid', 'email'],
  [OAuthProvider.ATPROTO]: ['atproto', 'transition:email'],
};

/**
 * Register an OAuth provider as a recovery method for the current identity.
 *
 * Requires an existing local identity. Serializes the personal-space genesis credential and
 * supplies it in-band so kms-service can verify it chains to the identity and route the OAuth
 * refresh token to that space. Returns the verified email from the provider so the caller can
 * mint a hub Account (e.g. redeem an invitation code with the verified email).
 */
const handler: Operation.WithHandler<typeof RegisterOAuthRecovery> = RegisterOAuthRecovery.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (data) {
      const client = yield* Capability.get(ClientCapabilities.Client);

      const identity = client.halo.identity.get();
      invariant(identity, 'Cannot register OAuth recovery without a local identity.');
      const identityKey = identity.identityKey.toHex();

      const edgeUrl = client.config.values.runtime?.services?.edge?.url;
      invariant(edgeUrl, 'Edge URL not configured.');

      const personalSpace = getPersonalSpace(client);
      invariant(personalSpace, 'Personal space not found.');

      // Find the SpaceGenesis credential for the personal space. kms-service verifies it chains to
      // identityKey and bears the personal-space tag, then routes the OAuth token to that space.
      const genesisCredential = client.halo
        .queryCredentials({ type: SPACE_GENESIS_CREDENTIAL_TYPE })
        .find((credential: any) => credential.subject?.assertion?.spaceKey?.equals?.(personalSpace.key));
      invariant(genesisCredential, 'Personal space genesis credential not found.');
      const personalSpaceCredential = plainCredentialToBase64(genesisCredential as any);

      const provider = data.provider as OAuthProvider;
      const scopes = SCOPES_BY_PROVIDER[provider] ?? ['openid', 'email'];
      const httpEndpoint = toHttpUrl(edgeUrl);

      // `personalSpaceCredential` is a local kms-service extension not yet present on the upstream
      // schema, so it is attached out-of-band on the request object.
      const initiateRequest: InitiateOAuthFlowRequest & {
        purpose: 'register';
        registerRecovery: true;
        personalSpaceCredential: string;
      } = {
        provider,
        spaceId: SpaceId.random(),
        accessTokenId: `register-${crypto.randomUUID()}`,
        scopes,
        purpose: 'register',
        registerRecovery: true,
        identityKey,
        personalSpaceCredential,
      };

      const initiateResponse = yield* Effect.tryPromise({
        try: () => initiateOAuthFlow(httpEndpoint, initiateRequest),
        catch: (error) => new Error(`OAuth initiate failed: ${error instanceof Error ? error.message : String(error)}`),
      });

      log.info('registering OAuth recovery', { provider });

      // Open the auth URL and wait for the redirect page to postMessage the verified email back.
      const email = yield* Effect.tryPromise({
        try: () => waitForRegistration(initiateResponse.authUrl, httpEndpoint),
        catch: (error) =>
          new Error(
            `OAuth registration cancelled or failed: ${error instanceof Error ? error.message : String(error)}`,
          ),
      });

      return { email };
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
 * redirect page to postMessage back. For the register flow the redirect page includes the
 * provider-verified `email` alongside the OAuth result.
 */
const waitForRegistration = (authUrl: string, expectedOrigin: string): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const popup = window.open(authUrl, 'dxos-oauth-register', 'width=520,height=720');
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
      const data = event.data as { success?: boolean; email?: string; reason?: string };
      if (typeof data !== 'object' || data === null || typeof data.success !== 'boolean') {
        return;
      }
      cleanup();
      if (data.success && data.email) {
        resolve(data.email);
      } else {
        reject(new Error(data.reason ?? 'OAuth registration did not return a verified email'));
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
