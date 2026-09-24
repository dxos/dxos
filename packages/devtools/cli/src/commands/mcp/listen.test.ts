//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Stream from 'effect/Stream';

import { EffectEx } from '@dxos/effect';

import { EVENT_FEED_URI as FEED, makeEventServer } from '../../testing/index.ts';
import { type ListenEvent, type ListenOptions, listenEvents, mcpEndpoint } from './listen.ts';

const ENDPOINT = 'http://events.test/mcp';

/** One server-sent event carrying a JSON-RPC message. */
const sse = (message: unknown) => `data: ${JSON.stringify(message)}\n\n`;

/**
 * Runs {@link listenEvents} in the background, recording every event as it arrives; a listener
 * failure rejects whatever the test is waiting on, so it surfaces rather than hanging the test.
 */
const startListening = (options: ListenOptions) => {
  const events: ListenEvent[] = [];
  const acknowledged = Promise.withResolvers<void>();
  const waiters: { readonly count: number; readonly resolve: () => void; readonly reject: (error: Error) => void }[] =
    [];
  let failure: Error | undefined;
  const notificationCount = () => events.filter((event) => event.kind === 'notification').length;
  const fiber = Effect.runFork(
    listenEvents(options).pipe(
      Stream.runForEach((event) =>
        Effect.sync(() => {
          events.push(event);
          if (event.kind === 'acknowledged') {
            acknowledged.resolve();
          }
          for (const waiter of waiters.filter(({ count }) => notificationCount() >= count)) {
            waiter.resolve();
          }
        }),
      ),
      // Defects too: a thrown bug would otherwise leave the test waiting out its timeout.
      Effect.tapCause((cause) =>
        Effect.sync(() => {
          if (Cause.hasInterruptsOnly(cause)) {
            return;
          }
          const error = new Error(Cause.pretty(cause));
          failure = error;
          acknowledged.reject(error);
          for (const waiter of waiters) {
            waiter.reject(error);
          }
        }),
      ),
    ),
  );
  return {
    events,
    acknowledged: acknowledged.promise,
    /** Resolves once `count` notifications have arrived in total. */
    notifications: (count: number) =>
      new Promise<void>((resolve, reject) => {
        if (failure !== undefined) {
          reject(failure);
        } else if (notificationCount() >= count) {
          resolve();
        } else {
          waiters.push({ count, resolve, reject });
        }
      }),
    stop: () => EffectEx.runPromise(Fiber.interrupt(fiber)),
  };
};

/** A response whose body is the given server-sent events, as a server streaming a listen request sends it. */
const eventStream = (body: string) =>
  new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });

const ACKNOWLEDGMENT = {
  jsonrpc: '2.0',
  method: 'notifications/subscriptions/acknowledged',
  params: { notifications: {} },
};

/** Every event {@link listenEvents} yields against a canned response, and the error it ends with, if any. */
const collect = async (response: Response) => {
  const events: ListenEvent[] = [];
  const error = await EffectEx.runPromise(
    listenEvents({ endpoint: ENDPOINT, notifications: {}, fetch: async () => response }).pipe(
      Stream.runForEach((event) => Effect.sync(() => events.push(event))),
      Effect.match({ onSuccess: () => undefined, onFailure: (error) => error.message }),
    ),
  );
  return { events, error };
};

describe('dx mcp listen', () => {
  test('reports each resource update, read back, after the acknowledgment', async ({ expect }) => {
    const server = makeEventServer();
    const listener = startListening({
      endpoint: ENDPOINT,
      notifications: { resourceSubscriptions: [FEED] },
      fetch: server.fetch,
    });
    try {
      await listener.acknowledged;
      await server.publish('CI build failed on main');
      await listener.notifications(1);
      await server.publish('CI build fixed');
      await listener.notifications(2);

      expect(listener.events).to.deep.equal([
        { kind: 'acknowledged', notifications: { resourceSubscriptions: [FEED] } },
        {
          kind: 'notification',
          method: 'notifications/resources/updated',
          uri: FEED,
          contents: [{ uri: FEED, text: 'CI build failed on main' }],
        },
        {
          kind: 'notification',
          method: 'notifications/resources/updated',
          uri: FEED,
          contents: [{ uri: FEED, text: 'CI build fixed' }],
        },
      ]);
    } finally {
      await listener.stop();
      await server.dispose();
    }
  });

  test('leaves the contents out when reading back is disabled', async ({ expect }) => {
    const server = makeEventServer();
    const listener = startListening({
      endpoint: ENDPOINT,
      notifications: { resourceSubscriptions: [FEED] },
      read: false,
      fetch: server.fetch,
    });
    try {
      await listener.acknowledged;
      await server.publish('ignored');
      await listener.notifications(1);
      expect(listener.events.at(-1)).to.deep.equal({
        kind: 'notification',
        method: 'notifications/resources/updated',
        uri: FEED,
      });
    } finally {
      await listener.stop();
      await server.dispose();
    }
  });

  test('acknowledges without the subscription when the server has no resources', async ({ expect }) => {
    const server = makeEventServer({ withResource: false });
    const listener = startListening({
      endpoint: ENDPOINT,
      notifications: { resourceSubscriptions: [FEED] },
      fetch: server.fetch,
    });
    try {
      await listener.acknowledged;
      expect(listener.events).to.deep.equal([{ kind: 'acknowledged', notifications: {} }]);
    } finally {
      await listener.stop();
      await server.dispose();
    }
  });

  test('retries once with a refreshed token after a 401', async ({ expect }) => {
    const server = makeEventServer();
    const tokens: (string | null)[] = [];
    const listener = startListening({
      endpoint: ENDPOINT,
      notifications: { resourceSubscriptions: [FEED] },
      token: 'expired',
      refreshToken: async () => 'fresh',
      fetch: async (url, init) => {
        const authorization = new Headers(init.headers).get('authorization');
        tokens.push(authorization);
        return authorization === 'Bearer expired' ? new Response('expired', { status: 401 }) : server.fetch(url, init);
      },
    });
    try {
      await listener.acknowledged;
      expect(tokens).to.deep.equal(['Bearer expired', 'Bearer fresh']);
    } finally {
      await listener.stop();
      await server.dispose();
    }
  });

  test('fails with the server status when the request is refused', async ({ expect }) => {
    const error = await EffectEx.runPromise(
      listenEvents({
        endpoint: ENDPOINT,
        notifications: { resourceSubscriptions: [FEED] },
        fetch: async () => new Response('nope', { status: 403 }),
      }).pipe(Stream.runDrain, Effect.flip),
    );
    expect(error.message).to.equal('MCP subscriptions/listen failed (403): nope');
  });

  test('reports a failed read-back on the event and keeps listening', async ({ expect }) => {
    const server = makeEventServer();
    let failReads = true;
    const listener = startListening({
      endpoint: ENDPOINT,
      notifications: { resourceSubscriptions: [FEED] },
      fetch: async (url, init) =>
        failReads && new Headers(init.headers).get('mcp-method') === 'resources/read'
          ? new Response('boom', { status: 500 })
          : server.fetch(url, init),
    });
    try {
      await listener.acknowledged;
      await server.publish('unreadable');
      await listener.notifications(1);
      failReads = false;
      await server.publish('readable');
      await listener.notifications(2);
      expect(listener.events.slice(1)).to.deep.equal([
        {
          kind: 'notification',
          method: 'notifications/resources/updated',
          uri: FEED,
          error: 'MCP resources/read failed (500): boom',
        },
        {
          kind: 'notification',
          method: 'notifications/resources/updated',
          uri: FEED,
          contents: [{ uri: FEED, text: 'readable' }],
        },
      ]);
    } finally {
      await listener.stop();
      await server.dispose();
    }
  });

  test('parses comments, CRLF line endings and multi-line data', async ({ expect }) => {
    // Indented JSON spans several lines, each its own `data:` line, which the parser must rejoin.
    const data = JSON.stringify(ACKNOWLEDGMENT, null, 1)
      .split('\n')
      .map((line) => `data: ${line}\r\n`)
      .join('');
    const body = `: keep-alive\r\n${data}\r\n${sse({ jsonrpc: '2.0', id: 'dx-mcp-listen', result: {} })}`;
    expect(await collect(eventStream(body))).to.deep.equal({
      events: [{ kind: 'acknowledged', notifications: {} }],
      error: undefined,
    });
  });

  test("fails with the server's error response to the listen request", async ({ expect }) => {
    const body = sse({ jsonrpc: '2.0', id: 'dx-mcp-listen', error: { code: -32601, message: 'no' } });
    const { error } = await collect(eventStream(body));
    expect(error).to.equal('MCP subscriptions/listen failed: {"code":-32601,"message":"no"}');
  });

  test('fails when the stream ends without closing the subscription', async ({ expect }) => {
    expect(await collect(eventStream(sse(ACKNOWLEDGMENT)))).to.deep.equal({
      events: [{ kind: 'acknowledged', notifications: {} }],
      error: 'MCP subscriptions/listen stream ended unexpectedly',
    });
  });

  test('tolerates an error response with a null id', async ({ expect }) => {
    const body = `${sse({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } })}${sse({ jsonrpc: '2.0', id: 'dx-mcp-listen', result: {} })}`;
    expect(await collect(eventStream(body))).to.deep.equal({ events: [], error: undefined });
  });

  test('resolves every spelling of a server URL to its one /mcp endpoint', ({ expect }) => {
    for (const url of ['https://host', 'https://host/', 'https://host/mcp', 'https://host/mcp/']) {
      expect(mcpEndpoint(url)).to.equal('https://host/mcp');
    }
    expect(mcpEndpoint('https://host/tenant/mcp/')).to.equal('https://host/tenant/mcp');
  });
});
