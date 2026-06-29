//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as Effect from 'effect/Effect';

import { Obj } from '@dxos/echo';
import { type EdgeHttpClient } from '@dxos/edge-client';
import { type EdgeEnvelope, type InitiateOAuthFlowResponse, type OAuthFlowResult } from '@dxos/protocols';
import { type AccessToken } from '@dxos/types';

import { type OAuthPreset } from './util';

// TODO(wittjosiah): Migrate the CLI `connector add` OAuth path off the hard-coded
//   `OAUTH_PRESETS` list onto the registered `Connector` capabilities (which already
//   declare each service's `oauth` provider/scopes), then this CLI-only flow can be
//   replaced by the connector-driven flow used by the app coordinator.

export const OAUTH_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes.

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
  /** If true, Edge returns a 302 redirect to composer:// instead of JavaScript. Used for mobile. */
  nativeAppRedirect?: boolean;
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
 * OAuth initiator that uses browser fetch.
 * Use on mobile (where Tauri commands are not registered) or when Origin can be set from JS.
 * Note: May not work where Origin header cannot be set (e.g., Tauri desktop with localhost redirect).
 */
export const createFetchOAuthInitiator = (): OAuthInitiator => ({
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

      const bodyPayload: Record<string, unknown> = {
        provider: params.provider,
        scopes: params.scopes,
        spaceId: params.spaceId,
        accessTokenId: params.accessTokenId,
      };
      if (params.nativeAppRedirect !== undefined) {
        bodyPayload.nativeAppRedirect = params.nativeAppRedirect;
      }

      // Make POST request using Effect Platform HTTP client.
      const httpClient = yield* HttpClient.HttpClient;
      const response = yield* HttpClientRequest.post(initiateUrl).pipe(
        HttpClientRequest.setHeaders(headers),
        HttpClientRequest.bodyJson(bodyPayload),
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
  const initiator = oauthInitiator ?? createFetchOAuthInitiator();

  yield* Effect.gen(function* () {
    const authHeader = getEdgeAuthHeader(edgeClient);

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

    Obj.update(accessToken, (accessToken) => {
      accessToken.token = oauthResult.accessToken;
    });
  }).pipe(Effect.ensuring(server.stop().pipe(Effect.catchAll(() => Effect.void))));
});

/**
 * Returns the Edge client's cached auth header if available, so Edge can associate
 * the OAuth flow with the current identity.
 */
// TODO(wittjosiah): EdgeHttpClient does not expose this publicly. Prefer adding a proper API
//   (e.g. getAuthHeader() or an initiateOAuth helper) to @dxos/edge-client instead of reading
//   private _authHeader. Cast is at the external-client boundary until that API exists.
const getEdgeAuthHeader = (edgeClient: EdgeHttpClient): string | undefined =>
  (edgeClient as unknown as { _authHeader?: string })._authHeader;
