//
// Copyright 2025 DXOS.org
//

import { spawn } from 'node:child_process';
import { platform } from 'node:os';

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as HttpRouter from '@effect/platform/HttpRouter';
import * as HttpServer from '@effect/platform/HttpServer';
import * as HttpServerRequest from '@effect/platform/HttpServerRequest';
import * as HttpServerResponse from '@effect/platform/HttpServerResponse';
import * as BunHttpServer from '@effect/platform-bun/BunHttpServer';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Ref from 'effect/Ref';
import * as Scope from 'effect/Scope';
import { getPort } from 'get-port-please';

import { ClientService } from '@dxos/client';
import { Database } from '@dxos/echo';
import { createEdgeClient } from '@dxos/functions-runtime/edge';
import { type EdgeEnvelope, type InitiateOAuthFlowResponse, type OAuthFlowResult } from '@dxos/protocols';
import { type AccessToken } from '@dxos/types';

import { type OAuthPreset } from './util';

const OAUTH_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Opens a URL in the default browser.
 */
const openBrowser = (url: string): Effect.Effect<void, Error> =>
  Effect.tryPromise({
    try: () => {
      return new Promise<void>((resolve, reject) => {
        const command = platform() === 'win32' ? 'start' : platform() === 'darwin' ? 'open' : 'xdg-open';
        const proc = spawn(command, [url], { stdio: 'ignore' });
        proc.on('error', reject);
        proc.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Browser command exited with code ${code}`));
          }
        });
      });
    },
    catch: (error) => new Error(`Failed to open browser: ${error}`),
  });

/**
 * Generates the HTML for the OAuth relay page.
 * This page redirects to the authUrl. When Edge completes OAuth and there's no window.opener,
 * Edge will redirect back to /redirect/oauth with the token in the URL.
 */
const getRelayPageHtml = (authUrl: string) => `
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
 * Creates an OAuth callback server.
 */
const createOAuthServer = Effect.fn(function* (
  port: number,
  callbackReceived: Ref.Ref<boolean>,
  callbackResult: Ref.Ref<Option.Option<OAuthFlowResult>>,
) {
  // Create router with OAuth endpoints
  const router = HttpRouter.empty.pipe(
    // OAuth relay page - redirects to Edge authUrl
    HttpRouter.get(
      '/oauth-relay',
      Effect.gen(function* () {
        const req = yield* HttpServerRequest.HttpServerRequest;
        // req.url is just the path, so we need to parse it manually or construct a full URL
        // Parse the path and query string
        const urlString = req.url.startsWith('http') ? req.url : `http://localhost${req.url}`;
        const url = new URL(urlString);
        const authUrl = url.searchParams.get('authUrl');
        if (!authUrl) {
          return yield* HttpServerResponse.text('Missing authUrl parameter', { status: 400 });
        }

        const html = getRelayPageHtml(authUrl);
        return yield* HttpServerResponse.text(html, {
          headers: { 'Content-Type': 'text/html' },
        });
      }),
    ),

    // OAuth redirect endpoint - Edge redirects here when there's no window.opener
    // Edge redirects to: ${requestOrigin}/redirect/oauth?accessTokenId=...&accessToken=...
    HttpRouter.get(
      '/redirect/oauth',
      Effect.gen(function* () {
        const req = yield* HttpServerRequest.HttpServerRequest;
        // req.url is just the path, so we need to parse it manually or construct a full URL
        const urlString = req.url.startsWith('http') ? req.url : `http://localhost${req.url}`;
        const url = new URL(urlString);
        const accessTokenId = url.searchParams.get('accessTokenId');
        const accessToken = url.searchParams.get('accessToken');

        if (!accessTokenId || !accessToken) {
          return yield* HttpServerResponse.text(
            '<html><body><h1>Authentication failed</h1><p>Missing access token parameters.</p></body></html>',
            {
              status: 400,
              headers: { 'Content-Type': 'text/html' },
            },
          );
        }

        const result: OAuthFlowResult = {
          success: true,
          accessTokenId,
          accessToken,
        };

        yield* Ref.set(callbackReceived, true);
        yield* Ref.set(callbackResult, Option.some(result));

        return yield* HttpServerResponse.text(
          '<html><body><h1>Authentication successful! You can close this window.</h1></body></html>',
          {
            headers: { 'Content-Type': 'text/html' },
          },
        );
      }),
    ),
  );

  // Create server app
  const app = router.pipe(HttpServer.serve());

  // Create server layer with Bun HTTP server
  const serverLayer = app.pipe(Layer.provide(BunHttpServer.layer({ port })));

  // Acquire the server in a scope
  const scope = yield* Scope.make();
  yield* Layer.build(serverLayer).pipe(Scope.extend(scope));

  return {
    stop: () => Scope.close(scope, Exit.void),
  };
});

/**
 * Performs OAuth flow for a preset.
 */
export const performOAuthFlow = Effect.fn(function* (preset: OAuthPreset, accessToken: AccessToken.AccessToken) {
  const client = yield* ClientService;
  const edgeClient = createEdgeClient(client);
  const spaceId = yield* Database.Service.spaceId;

  // Find available port
  const port = yield* Effect.promise(() => getPort({ random: true }));
  const origin = `http://localhost:${port}`;

  // Create callback handler
  const callbackReceived = yield* Ref.make(false);
  const callbackResult = yield* Ref.make<Option.Option<OAuthFlowResult>>(Option.none());

  // Create server
  const server = yield* createOAuthServer(port, callbackReceived, callbackResult);

  yield* Effect.gen(function* () {
    // Initiate OAuth flow using Effect Platform HTTP client
    const edgeUrl = edgeClient.baseUrl;
    const initiateUrl = new URL('/oauth/initiate', edgeUrl).toString();

    // Get auth header if needed
    let authHeader: string | undefined;
    if (edgeClient['_authHeader']) {
      authHeader = edgeClient['_authHeader'];
    }

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Origin: origin,
    };
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    // Make POST request using Effect Platform HTTP client
    const httpClient = yield* HttpClient.HttpClient;
    const response = yield* HttpClientRequest.post(initiateUrl).pipe(
      HttpClientRequest.setHeaders(headers),
      HttpClientRequest.bodyJson({
        provider: preset.provider,
        scopes: preset.scopes,
        spaceId,
        accessTokenId: accessToken.id,
      }),
      Effect.flatMap((req) => httpClient.execute(req)),
    );

    const body = (yield* response.json) as EdgeEnvelope<InitiateOAuthFlowResponse>;

    if (!body.success) {
      return yield* Effect.fail(new Error(`OAuth initiation failed: ${body.error?.message || 'Unknown error'}`));
    }

    const { authUrl } = body.data;

    // Open relay page in browser
    const relayUrl = `${origin}/oauth-relay?authUrl=${encodeURIComponent(authUrl)}`;
    yield* openBrowser(relayUrl);

    // Wait for callback with timeout
    yield* Effect.race(
      Effect.gen(function* () {
        // Poll for callback
        while (true) {
          const received = yield* Ref.get(callbackReceived);
          if (received) {
            break;
          }
          yield* Effect.sleep('500 millis');
        }
      }),
      Effect.sleep(`${OAUTH_TIMEOUT_MS} millis`).pipe(
        Effect.flatMap(() => Effect.fail(new Error('OAuth flow timed out'))),
      ),
    );

    // Check result and update token
    const result = yield* Ref.get(callbackResult);
    const oauthResult = yield* Option.match(result, {
      onNone: () => Effect.fail(new Error('OAuth callback received but no result')),
      onSome: (value) => Effect.succeed(value),
    });

    // TypeScript type narrowing for discriminated union
    if (oauthResult.success === false) {
      return yield* Effect.fail(new Error(`OAuth flow failed: ${oauthResult.reason}`));
    }

    accessToken.token = oauthResult.accessToken;
  }).pipe(Effect.provide(FetchHttpClient.layer), Effect.ensuring(server.stop()));
});
