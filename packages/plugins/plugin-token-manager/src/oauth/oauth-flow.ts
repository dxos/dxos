//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Ref from 'effect/Ref';

import { type EdgeHttpClient } from '@dxos/edge-client';
import { type EdgeEnvelope, type InitiateOAuthFlowResponse, type OAuthFlowResult } from '@dxos/protocols';
import { type AccessToken } from '@dxos/types';

import { type OAuthPreset } from '../defs';

export const OAUTH_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes.

/**
 * Generates the HTML for the OAuth relay page.
 * This page redirects to the authUrl. When Edge completes OAuth and there's no window.opener,
 * Edge will redirect back to /redirect/oauth with the token in the URL.
 */
export const getRelayPageHtml = (authUrl: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script>
    window.location.href = '${authUrl.replace(/'/g, "\\'")}';
  </script>
</head>
<body></body>
</html>
`;

/**
 * OAuth server provider interface.
 * Platform-specific implementations provide this.
 */
export type OAuthServerProvider = {
  /**
   * Starts the OAuth callback server.
   * @returns Effect that resolves to the server instance with port and control methods.
   */
  start: () => Effect.Effect<OAuthServer, Error>;
};

/**
 * OAuth server instance.
 */
export type OAuthServer = {
  /** Port the server is listening on. */
  port: number;
  /** Stops the server. */
  stop: () => Effect.Effect<void, Error>;
  /** Waits for OAuth result for a specific access token ID. */
  waitForResult: (accessTokenId: string, timeoutMs?: number) => Effect.Effect<OAuthFlowResult, Error>;
};

/**
 * Type for browser opener function.
 */
export type BrowserOpener = (url: string) => Effect.Effect<void, Error>;

/**
 * Parameters for OAuth initiation.
 */
export type OAuthInitiateParams = {
  edgeUrl: string;
  provider: string;
  scopes: string[];
  spaceId: string;
  accessTokenId: string;
  redirectOrigin: string;
  authHeader?: string;
};

/**
 * OAuth initiator interface for platform-specific OAuth initiation.
 * Used to bypass browser restrictions on setting Origin headers.
 */
export type OAuthInitiator = {
  /**
   * Initiates OAuth flow with Edge.
   * @returns Effect that resolves to the authUrl.
   */
  initiate: (params: OAuthInitiateParams) => Effect.Effect<string, Error>;
};

/**
 * Default OAuth initiator that uses browser fetch.
 * Note: This may not work correctly in environments where Origin header cannot be set (e.g., Tauri).
 */
const createDefaultOAuthInitiator = (edgeClient: EdgeHttpClient): OAuthInitiator => ({
  initiate: (params) =>
    Effect.gen(function* () {
      const initiateUrl = new URL('/oauth/initiate', params.edgeUrl).toString();

      // Build headers.
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Origin: params.redirectOrigin,
      };
      if (params.authHeader) {
        headers['Authorization'] = params.authHeader;
      }

      // Make POST request using Effect Platform HTTP client.
      const httpClient = yield* HttpClient.HttpClient;
      const response = yield* HttpClientRequest.post(initiateUrl).pipe(
        HttpClientRequest.setHeaders(headers),
        HttpClientRequest.bodyJson({
          provider: params.provider,
          scopes: params.scopes,
          spaceId: params.spaceId,
          accessTokenId: params.accessTokenId,
        }),
        Effect.flatMap((req) => httpClient.execute(req)),
      );

      const body = (yield* response.json) as EdgeEnvelope<InitiateOAuthFlowResponse>;

      if (!body.success) {
        return yield* Effect.fail(new Error(`OAuth initiation failed: ${body.error?.message || 'Unknown error'}`));
      }

      return body.data.authUrl;
    }).pipe(
      Effect.provide(FetchHttpClient.layer),
      Effect.catchAll((error) => Effect.fail(new Error(`OAuth initiation failed: ${error}`))),
    ),
});

/**
 * Performs OAuth flow using platform-specific implementations.
 * @param preset - OAuth preset configuration.
 * @param accessToken - Access token object to update with the result.
 * @param edgeClient - Edge client instance.
 * @param spaceId - Space ID.
 * @param serverProvider - Platform-specific OAuth server provider.
 * @param openBrowser - Platform-specific browser opener function.
 * @param oauthInitiator - Optional platform-specific OAuth initiator (e.g., for Tauri to bypass Origin header restrictions).
 */
export const performOAuthFlow = Effect.fn(function* (
  preset: OAuthPreset,
  accessToken: AccessToken.AccessToken,
  edgeClient: EdgeHttpClient,
  spaceId: string,
  serverProvider: OAuthServerProvider,
  openBrowser: BrowserOpener,
  oauthInitiator?: OAuthInitiator,
) {
  // Start server.
  const server = yield* serverProvider.start();
  const origin = `http://localhost:${server.port}`;

  // Use provided initiator or default.
  const initiator = oauthInitiator ?? createDefaultOAuthInitiator(edgeClient);

  yield* Effect.gen(function* () {
    // Get auth header if needed.
    let authHeader: string | undefined;
    if ((edgeClient as any)['_authHeader']) {
      authHeader = (edgeClient as any)['_authHeader'];
    }

    // Initiate OAuth flow.
    const authUrl = yield* initiator.initiate({
      edgeUrl: edgeClient.baseUrl,
      provider: preset.provider,
      scopes: preset.scopes,
      spaceId,
      accessTokenId: accessToken.id,
      redirectOrigin: origin,
      authHeader,
    });

    // Open relay page in browser.
    const relayUrl = `${origin}/oauth-relay?authUrl=${encodeURIComponent(authUrl)}`;
    yield* openBrowser(relayUrl);

    // Wait for callback with timeout.
    const oauthResult = yield* server.waitForResult(accessToken.id, OAUTH_TIMEOUT_MS);

    // TypeScript type narrowing for discriminated union.
    if (oauthResult.success === false) {
      return yield* Effect.fail(new Error(`OAuth flow failed: ${oauthResult.reason}`));
    }

    accessToken.token = oauthResult.accessToken;
  }).pipe(Effect.ensuring(server.stop().pipe(Effect.catchAll(() => Effect.void))));
});

/**
 * Creates an Effect-based OAuth server provider.
 * Used for CLI with Effect Platform's HTTP server.
 */
export const createEffectOAuthServerProvider = (
  createServer: (
    port: number,
    callbackReceived: Ref.Ref<boolean>,
    callbackResult: Ref.Ref<Option.Option<OAuthFlowResult>>,
  ) => Effect.Effect<{ stop: () => Effect.Effect<void, never> }, Error>,
  getPort: () => Effect.Effect<number, Error>,
): OAuthServerProvider => ({
  start: () =>
    Effect.gen(function* () {
      const port = yield* getPort();
      const callbackReceived = yield* Ref.make(false);
      const callbackResult = yield* Ref.make<Option.Option<OAuthFlowResult>>(Option.none());

      const server = yield* createServer(port, callbackReceived, callbackResult);

      return {
        port,
        stop: () => server.stop().pipe(Effect.catchAll(() => Effect.void)),
        waitForResult: (accessTokenId: string, timeoutMs: number = OAUTH_TIMEOUT_MS) =>
          Effect.race(
            Effect.gen(function* () {
              // Poll for callback.
              while (true) {
                const received = yield* Ref.get(callbackReceived);
                if (received) {
                  break;
                }
                yield* Effect.sleep('500 millis');
              }

              // Get result.
              const result = yield* Ref.get(callbackResult);
              return yield* Option.match(result, {
                onNone: () => Effect.fail(new Error('OAuth callback received but no result')),
                onSome: (value) => Effect.succeed(value),
              });
            }),
            Effect.sleep(`${timeoutMs} millis`).pipe(
              Effect.flatMap(() => Effect.fail(new Error('OAuth flow timed out'))),
            ),
          ),
      };
    }),
});
