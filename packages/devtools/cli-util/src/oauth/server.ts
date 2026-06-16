//
// Copyright 2026 DXOS.org
//

import * as BunHttpServer from '@effect/platform-bun/BunHttpServer';
import * as HttpRouter from '@effect/platform/HttpRouter';
import * as HttpServer from '@effect/platform/HttpServer';
import * as HttpServerRequest from '@effect/platform/HttpServerRequest';
import * as HttpServerResponse from '@effect/platform/HttpServerResponse';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Ref from 'effect/Ref';
import * as Scope from 'effect/Scope';
import { getPort } from 'get-port-please';

import { openBrowser } from '../util/platform';

/** Default timeout for a full OAuth browser round-trip. */
export const OAUTH_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Relay page that performs a top-level redirect to Edge's `authUrl`. Edge finalizes the flow
 * by redirecting the browser back to this server's callback path (bsky.social nullifies
 * `window.opener`, so a popup + postMessage relay can't be used).
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

type CallbackOutcome = { success: true; params: Record<string, string> } | { success: false; reason: string };

/**
 * A running local OAuth callback server.
 */
export type OAuthCallbackServer = {
  /** Port the server is listening on. */
  readonly port: number;
  /** Origin (e.g. `http://localhost:1234`) to advertise to Edge as the redirect target. */
  readonly origin: string;
  /** Opens `authUrl` in the browser via the local relay page. */
  readonly open: (authUrl: string) => Effect.Effect<void, Error>;
  /** Resolves with the captured callback query params, or fails on an `error` param / timeout. */
  readonly waitForResult: (timeoutMs?: number) => Effect.Effect<Record<string, string>, Error>;
  /** Stops the server. */
  readonly stop: () => Effect.Effect<void>;
};

/**
 * Starts a local Bun HTTP server that relays the browser to Edge's auth URL and captures Edge's
 * eventual top-level redirect back to `callbackPath`. Generic over the callback shape: all query
 * params are captured and returned; an `error` query param fails the wait.
 *
 * Used by both the integration-connect flow (`/redirect/oauth`) and the identity-recovery login
 * flow (`/redirect/oauth-recovery`).
 */
export const startOAuthCallbackServer = (callbackPath: `/${string}`): Effect.Effect<OAuthCallbackServer, Error> =>
  Effect.gen(function* () {
    const port = yield* Effect.promise(() => getPort({ random: true }));
    const origin = `http://localhost:${port}`;
    const received = yield* Ref.make(false);
    const outcome = yield* Ref.make<Option.Option<CallbackOutcome>>(Option.none());

    // req.url is only the path + query, so reconstruct a full URL to parse the query string.
    const parseUrl = (rawUrl: string) => new URL(rawUrl.startsWith('http') ? rawUrl : `http://localhost${rawUrl}`);

    const router = HttpRouter.empty.pipe(
      HttpRouter.get(
        '/oauth-relay',
        Effect.gen(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest;
          const authUrl = parseUrl(request.url).searchParams.get('authUrl');
          if (!authUrl) {
            return yield* HttpServerResponse.text('Missing authUrl parameter', { status: 400 });
          }
          return yield* HttpServerResponse.text(getRelayPageHtml(authUrl), {
            headers: { 'Content-Type': 'text/html' },
          });
        }),
      ),
      HttpRouter.get(
        callbackPath,
        Effect.gen(function* () {
          if (Option.isSome(yield* Ref.get(outcome))) {
            return yield* HttpServerResponse.text('Already received.', { status: 400 });
          }

          const request = yield* HttpServerRequest.HttpServerRequest;
          const params = parseUrl(request.url).searchParams;
          const error = params.get('error');
          if (error) {
            yield* Ref.set(outcome, Option.some({ success: false, reason: error }));
            yield* Ref.set(received, true);
            return yield* HttpServerResponse.text(
              `<html><body><h1>Authentication failed</h1><p>${error}</p></body></html>`,
              { status: 400, headers: { 'Content-Type': 'text/html' } },
            );
          }

          const captured: Record<string, string> = {};
          for (const [key, value] of params.entries()) {
            captured[key] = value;
          }
          yield* Ref.set(outcome, Option.some({ success: true, params: captured }));
          yield* Ref.set(received, true);
          return yield* HttpServerResponse.text(
            '<html><body><h1>Authentication successful! You can close this window.</h1></body></html>',
            { headers: { 'Content-Type': 'text/html' } },
          );
        }),
      ),
    );

    const app = router.pipe(HttpServer.serve());
    const serverLayer = app.pipe(Layer.provide(BunHttpServer.layer({ port })));
    const scope = yield* Scope.make();
    yield* Layer.build(serverLayer).pipe(Scope.extend(scope));

    const waitForResult = (timeoutMs: number = OAUTH_TIMEOUT_MS) =>
      Effect.race(
        Effect.gen(function* () {
          while (true) {
            if (yield* Ref.get(received)) {
              break;
            }
            yield* Effect.sleep('500 millis');
          }
          const result = yield* Ref.get(outcome);
          return yield* Option.match(result, {
            onNone: () => Effect.fail(new Error('OAuth callback received but no result')),
            onSome: (value) =>
              value.success
                ? Effect.succeed(value.params)
                : Effect.fail(new Error(`OAuth flow failed: ${value.reason}`)),
          });
        }),
        Effect.sleep(`${timeoutMs} millis`).pipe(Effect.flatMap(() => Effect.fail(new Error('OAuth flow timed out')))),
      );

    return {
      port,
      origin,
      open: (authUrl: string) => openBrowser(`${origin}/oauth-relay?authUrl=${encodeURIComponent(authUrl)}`),
      waitForResult,
      stop: () => Scope.close(scope, Exit.void).pipe(Effect.catchAll(() => Effect.void)),
    } satisfies OAuthCallbackServer;
  });
