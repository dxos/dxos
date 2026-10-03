//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Scope from 'effect/Scope';
import { type IncomingMessage, type ServerResponse, createServer } from 'node:http';

export type LoopbackServer = {
  readonly port: number;
};

/**
 * Serves `handle` on a loopback port for the caller's scope, so a failed test cannot leave a port
 * bound for the next one.
 */
export const listenLoopback = (
  handle: (request: IncomingMessage, response: ServerResponse) => Promise<void>,
): Effect.Effect<LoopbackServer, never, Scope.Scope> =>
  Effect.gen(function* () {
    const listener = yield* Effect.acquireRelease(
      Effect.sync(() =>
        createServer((request, response) => {
          // A rejection past the handler's own reporting (a client that aborted mid-body, a write
          // after the headers went out) would otherwise surface as an unhandled rejection.
          handle(request, response).catch((error: unknown) => {
            if (response.headersSent) {
              response.destroy();
            } else {
              response.writeHead(500, { 'Content-Type': 'text/plain' }).end(String(error));
            }
          });
        }),
      ),
      (listener) =>
        Effect.promise(async () => {
          // Stop accepting first, then cut what is open: a client holding its connection would
          // otherwise make `close` wait for it, and a late arrival would keep the port bound.
          const closed = new Promise<void>((resolve) => listener.close(() => resolve()));
          listener.closeAllConnections();
          await closed;
        }),
    );

    // Port 0, and the address read back after `listening`: a fixed port collides with whatever the
    // developer already has bound, and with a second test running beside this one.
    const port = yield* Effect.callback<number>((resume) => {
      listener.once('error', (error) => resume(Effect.die(error)));
      listener.once('listening', () => {
        const address = listener.address();
        resume(
          address !== null && typeof address === 'object'
            ? Effect.succeed(address.port)
            : Effect.die(new Error(`Loopback server bound to an unexpected address: ${String(address)}`)),
        );
      });
      listener.listen(0, '127.0.0.1');
    });

    return { port };
  });

/**
 * Literal `127.0.0.1`, never `localhost`: the name resolves to `::1` first on Linux, which no
 * listener bound to the IPv4 loopback answers.
 */
export const loopbackUrl = (port: number, path = '/'): string => `http://127.0.0.1:${port}${path}`;
