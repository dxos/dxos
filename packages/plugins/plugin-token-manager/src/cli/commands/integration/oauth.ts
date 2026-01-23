//
// Copyright 2025 DXOS.org
//

import { spawn } from 'node:child_process';
import { platform } from 'node:os';

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
import { type OAuthFlowResult } from '@dxos/protocols';
import { type AccessToken } from '@dxos/types';

import { type OAuthServerProvider, getRelayPageHtml, performOAuthFlow as performOAuthFlowShared } from '../../../oauth';

import { type OAuthPreset } from './util';

/**
 * Opens a URL in the default browser using system commands.
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
 * Creates an OAuth callback server using Effect Platform's HTTP server with Bun.
 */
const createBunOAuthServer = Effect.fn(function* (
  port: number,
  callbackReceived: Ref.Ref<boolean>,
  callbackResult: Ref.Ref<Option.Option<OAuthFlowResult>>,
) {
  // Create router with OAuth endpoints.
  const router = HttpRouter.empty.pipe(
    // OAuth relay page - redirects to Edge authUrl.
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

    // OAuth redirect endpoint - Edge redirects here when there's no window.opener.
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

  // Create server app.
  const app = router.pipe(HttpServer.serve());

  // Create server layer with Bun HTTP server.
  const serverLayer = app.pipe(Layer.provide(BunHttpServer.layer({ port })));

  // Acquire the server in a scope.
  const scope = yield* Scope.make();
  yield* Layer.build(serverLayer).pipe(Scope.extend(scope));

  return {
    stop: () => Scope.close(scope, Exit.void),
  };
});

/**
 * Creates a Bun-based OAuth server provider for CLI usage.
 */
const createBunServerProvider = (): OAuthServerProvider => ({
  start: () =>
    Effect.gen(function* () {
      const port = yield* Effect.promise(() => getPort({ random: true }));
      const callbackReceived = yield* Ref.make(false);
      const callbackResult = yield* Ref.make<Option.Option<OAuthFlowResult>>(Option.none());

      const server = yield* createBunOAuthServer(port, callbackReceived, callbackResult);

      return {
        port,
        stop: () => server.stop().pipe(Effect.catchAll(() => Effect.void)),
        waitForResult: (accessTokenId: string, timeoutMs: number = 5 * 60 * 1000) =>
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

/**
 * Performs OAuth flow for a preset using Bun HTTP server.
 */
export const performOAuthFlow = Effect.fn(function* (preset: OAuthPreset, accessToken: AccessToken.AccessToken) {
  const client = yield* ClientService;
  const edgeClient = createEdgeClient(client);
  const spaceId = yield* Database.Service.spaceId;

  yield* performOAuthFlowShared(preset, accessToken, edgeClient, spaceId, createBunServerProvider(), openBrowser);
});
