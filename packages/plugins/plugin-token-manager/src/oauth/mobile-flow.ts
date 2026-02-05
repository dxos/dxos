//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Obj } from '@dxos/echo';
import { type EdgeHttpClient } from '@dxos/edge-client';
import { type AccessToken } from '@dxos/types';

import { type OAuthPreset } from '../defs';

import { MOBILE_OAUTH_ORIGIN, createMobileDeepLinkListener } from './mobile-deep-link';
import { type BrowserOpener, OAUTH_TIMEOUT_MS, type OAuthInitiator } from './oauth-flow';
import { createTauriOAuthInitiator, openTauriBrowser } from './tauri-server';

/**
 * Parameters for mobile OAuth flow.
 */
export type MobileOAuthParams = {
  preset: OAuthPreset;
  accessToken: AccessToken.AccessToken;
  edgeClient: EdgeHttpClient;
  spaceId: string;
  openBrowser?: BrowserOpener;
  oauthInitiator?: OAuthInitiator;
};

/**
 * Performs OAuth flow on mobile using App Links / Universal Links.
 *
 * Flow:
 * 1. Creates a deep link listener for OAuth callbacks.
 * 2. Calls Edge's /oauth/initiate with Origin: https://composer.dxos.org.
 * 3. Opens the auth URL in the system browser.
 * 4. Waits for the deep link callback from the mobile OS.
 * 5. Updates the access token with the result.
 */
export const performMobileOAuthFlow = ({
  preset,
  accessToken,
  edgeClient,
  spaceId,
  openBrowser = openTauriBrowser,
  oauthInitiator = createTauriOAuthInitiator(),
}: MobileOAuthParams): Effect.Effect<void, Error> =>
  Effect.gen(function* () {
    // Create deep link listener for OAuth callbacks.
    const listener = yield* createMobileDeepLinkListener();

    yield* Effect.gen(function* () {
      // Get auth header if available.
      let authHeader: string | undefined;
      if ((edgeClient as any)['_authHeader']) {
        authHeader = (edgeClient as any)['_authHeader'];
      }

      // Initiate OAuth flow with mobile origin.
      // Edge will redirect to https://composer.dxos.org/redirect/oauth after OAuth completes.
      const authUrl = yield* oauthInitiator.initiate({
        edgeUrl: edgeClient.baseUrl,
        provider: preset.provider,
        scopes: preset.scopes,
        spaceId,
        accessTokenId: accessToken.id,
        redirectOrigin: MOBILE_OAUTH_ORIGIN,
        authHeader,
      });

      // Open auth URL directly in browser.
      yield* openBrowser(authUrl);

      // Wait for OAuth callback via deep link.
      const oauthResult = yield* listener.waitForResult(accessToken.id, OAUTH_TIMEOUT_MS);

      // Handle result.
      if (oauthResult.success === false) {
        return yield* Effect.fail(new Error(`OAuth flow failed: ${oauthResult.reason}`));
      }

      Obj.change(accessToken, (t) => {
        t.token = oauthResult.accessToken;
      });
    }).pipe(Effect.ensuring(listener.unlisten()));
  });

/**
 * Checks if the current platform is mobile (iOS or Android).
 */
export const isMobilePlatform = (): Effect.Effect<boolean, Error> =>
  Effect.tryPromise({
    try: async () => {
      const { platform } = await import('@tauri-apps/plugin-os');
      const os = platform();
      return os === 'ios' || os === 'android';
    },
    catch: (error) => new Error(`Failed to detect platform: ${error}`),
  });
