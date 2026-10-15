//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as McpProtocol from 'effect/unstable/ai/McpProtocol';
import * as McpServer from 'effect/unstable/ai/McpServer';
import * as HttpRouter from 'effect/unstable/http/HttpRouter';
import http from 'node:http';

import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';

/** The one resource an {@link EventServer} publishes updates to. */
export const EVENT_FEED_URI = 'events://feed';

export type EventServer = {
  /** Serves one request in process, in the shape `listenEvents` accepts for its `fetch`. */
  readonly fetch: (url: string, init: RequestInit) => Promise<Response>;
  /** Replaces the feed's contents and notifies every subscription to it. */
  readonly publish: (text: string) => Promise<void>;
  /** Serves over HTTP on a free loopback port; resolves with the MCP endpoint URL. */
  readonly serve: () => Promise<string>;
  /** Resolves once the server has answered a `subscriptions/listen` request with its stream, i.e. a listener is live. */
  readonly listening: Promise<void>;
  readonly dispose: () => Promise<void>;
};

export type EventServerOptions = {
  /** Register the feed resource (the default); without it the server can honour no subscription. */
  readonly withResource?: boolean;
};

/**
 * An effect `McpServer` speaking only 2026-07-28 over HTTP — the stack DXOS servers are built on —
 * with one subscribable resource whose updates the test publishes.
 */
export const makeEventServer = ({ withResource = true }: EventServerOptions = {}): EventServer => {
  let latest = '';
  let notify: ((uri: string) => Promise<void>) | undefined;
  const listening = Promise.withResolvers<void>();

  const capture = Layer.effectDiscard(
    Effect.gen(function* () {
      const server = yield* McpServer.McpServer;
      notify = (uri) => EffectEx.runPromise(server.notifications['notifications/resources/updated']({ uri }));
    }),
  );
  const feed = McpServer.resource({
    uri: EVENT_FEED_URI,
    name: 'feed',
    mimeType: 'text/plain',
    content: Effect.sync(() => latest),
  });
  const layer = (withResource ? Layer.mergeAll(capture, feed) : capture).pipe(
    Layer.provide(
      McpServer.layerHttp({ name: 'events', version: '1', path: '/mcp', protocols: [McpProtocol.v2026_07_28] }),
    ),
  );
  const { handler, dispose } = HttpRouter.toWebHandler(layer);
  let httpServer: http.Server | undefined;

  const bridge = async (request: http.IncomingMessage, response: http.ServerResponse) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(chunk);
    }
    const headers = new Headers();
    for (const [name, value] of Object.entries(request.headers)) {
      for (const entry of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
        headers.append(name, entry);
      }
    }
    const reply = await handler(
      new Request(`http://${request.headers.host}${request.url}`, {
        method: request.method,
        headers,
        body: chunks.length > 0 ? Buffer.concat(chunks) : undefined,
      }),
    );
    response.writeHead(reply.status, Object.fromEntries(reply.headers));
    if (reply.body === null) {
      response.end();
      return;
    }
    const isListen = headers.get('mcp-method') === 'subscriptions/listen';
    const reader = reply.body.getReader();
    // A listener that disconnects must release the server's end of its never-ending stream.
    response.on('close', () => {
      // Cancelling a body that already errored rejects with that error, which the read loop reports.
      reader.cancel().catch((error) => log.catch(error));
    });
    for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
      response.write(chunk.value);
      if (isListen) {
        listening.resolve();
      }
    }
    response.end();
  };

  return {
    fetch: async (url, init) => {
      const reply = await handler(new Request(url, init));
      if (new Headers(init.headers).get('mcp-method') === 'subscriptions/listen' && reply.status === 200) {
        listening.resolve();
      }
      return reply;
    },
    publish: async (text) => {
      latest = text;
      if (notify === undefined) {
        throw new Error('event server has not served a request yet');
      }
      await notify(EVENT_FEED_URI);
    },
    serve: () =>
      new Promise((resolve, reject) => {
        const server = http.createServer((request, response) => {
          bridge(request, response).catch((error) => response.destroy(error));
        });
        httpServer = server;
        server.listen(0, '127.0.0.1', () => {
          const address = server.address();
          // A string address means a pipe or socket path, which `listen(0, host)` never binds.
          if (address === null || typeof address === 'string') {
            reject(new Error(`event server bound an unexpected address: ${address}`));
            return;
          }
          resolve(`http://127.0.0.1:${address.port}/mcp`);
        });
      }),
    listening: listening.promise,
    dispose: async () => {
      httpServer?.closeAllConnections();
      await new Promise<void>((resolve) => (httpServer ? httpServer.close(() => resolve()) : resolve()));
      await dispose();
    },
  };
};
