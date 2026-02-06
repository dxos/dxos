//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Obj } from '@dxos/echo';
import { type EdgeHttpClient } from '@dxos/edge-client';
import { log } from '@dxos/log';
import { type AccessToken } from '@dxos/types';

import { type OAuthPreset } from '../defs';

import { getEdgeAuthHeader } from './edge-auth-header';
import { MOBILE_OAUTH_ORIGIN } from './mobile-deep-link';
import { type OAuthInitiator } from './oauth-flow';
import { createTauriOAuthInitiator } from './tauri-server';

/** Custom URL scheme for OAuth callback on mobile. */
const CALLBACK_SCHEME = 'composer';

/**
 * Parameters for mobile OAuth flow.
 */
export type MobileOAuthParams = {
  preset: OAuthPreset;
  accessToken: AccessToken.AccessToken;
  edgeClient: EdgeHttpClient;
  spaceId: string;
  oauthInitiator?: OAuthInitiator;
};

/**
 * Performs OAuth flow on mobile using ASWebAuthenticationSession (iOS) or Custom Tabs (Android).
 *
 * Flow:
 * 1. Calls Edge's /oauth/initiate with Origin: https://composer.dxos.org.
 * 2. Opens a secure browser via tauri-plugin-web-auth.
 * 3. User authenticates with the OAuth provider.
 * 4. Edge exchanges code for token, redirects to https://composer.dxos.org/redirect/oauth.
 * 5. Cloudflare worker redirects to composer://oauth/callback with tokens.
 * 6. ASWebAuthenticationSession captures the custom scheme redirect.
 * 7. Updates the access token with the result.
 */
export const performMobileOAuthFlow = ({
  preset,
  accessToken,
  edgeClient,
  spaceId,
  oauthInitiator = createTauriOAuthInitiator(),
}: MobileOAuthParams): Effect.Effect<void, Error> =>
  Effect.gen(function* () {
    const authHeader = getEdgeAuthHeader(edgeClient);

    // Initiate OAuth flow with mobile origin.
    // Edge will redirect directly to composer://oauth/callback after OAuth completes.
    log.info('Initiating mobile OAuth flow', { provider: preset.provider, spaceId });
    const authUrl = yield* oauthInitiator.initiate({
      edgeUrl: edgeClient.baseUrl,
      provider: preset.provider,
      scopes: preset.scopes,
      spaceId,
      accessTokenId: accessToken.id,
      redirectOrigin: MOBILE_OAUTH_ORIGIN,
      authHeader,
      nativeAppRedirect: true,
    });

    // Use ASWebAuthenticationSession to handle OAuth.
    // This opens a secure browser and captures the callback URL when
    // Cloudflare redirects to composer://oauth/callback.
    log.info('Opening secure browser for OAuth', { authUrl });
    const callbackUrl = yield* Effect.tryPromise({
      try: async () => {
        const { authenticate } = await import('tauri-plugin-web-auth-api');
        const response = await authenticate({
          url: authUrl,
          callbackScheme: CALLBACK_SCHEME,
        });
        return response.callbackUrl;
      },
      catch: (error) => new Error(`Authentication failed: ${error}`),
    });

    log.info('OAuth callback received', { callbackUrl });

    // Parse the callback URL for tokens.
    const url = new URL(callbackUrl);
    const accessTokenId = url.searchParams.get('accessTokenId');
    const accessTokenValue = url.searchParams.get('accessToken');
    const error = url.searchParams.get('error');

    if (error) {
      return yield* Effect.fail(new Error(`OAuth flow failed: ${error}`));
    }

    if (!accessTokenValue) {
      return yield* Effect.fail(new Error('OAuth callback missing access token'));
    }

    if (accessTokenId !== accessToken.id) {
      return yield* Effect.fail(new Error('OAuth callback token ID mismatch'));
    }

    // Update the access token with the received value.
    Obj.change(accessToken, (t) => {
      t.token = accessTokenValue;
    });

    log.info('Mobile OAuth flow completed successfully');
  });

/**
 * Checks if the current platform is mobile (iOS or Android).
 */
export const isMobilePlatform = (): Effect.Effect<boolean, never> =>
  Effect.tryPromise({
    try: async () => {
      const { platform } = await import('@tauri-apps/plugin-os');
      const os = platform();
      return os === 'ios' || os === 'android';
    },
    catch: (error) => new Error(`Failed to detect platform: ${error}`),
  }).pipe(Effect.catchAll(() => Effect.succeed(false)));
