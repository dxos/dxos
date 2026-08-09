//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Redacted from 'effect/Redacted';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';
import { describe, expect, test } from 'vitest';

import { isErrorResponse, isMissingAccess, isRatelimited } from './errors';
import { DiscordConfig, DiscordREST, DiscordRESTLive } from './rest';

type Reply = { status: number; body: unknown };

/** Serves canned replies in order and records every request the client made. */
const stubFetch = (replies: ReadonlyArray<Reply>) => {
  const requests: Array<{ url: string; headers: Headers }> = [];
  let index = 0;
  const fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof URL ? input.toString() : typeof input === 'string' ? input : input.url;
    requests.push({ url, headers: new Headers(init?.headers ?? undefined) });
    const reply = replies[Math.min(index++, replies.length - 1)];
    return Promise.resolve(
      new Response(JSON.stringify(reply.body), {
        status: reply.status,
        headers: { 'content-type': 'application/json' },
      }),
    );
  }) as typeof globalThis.fetch;
  return { fetch, requests };
};

const testLayer = (replies: ReadonlyArray<Reply>, tokenKind: 'Bot' | 'Bearer' = 'Bot') => {
  const stub = stubFetch(replies);
  const layer = DiscordRESTLive.pipe(
    Layer.provide(
      DiscordConfig.layer({
        token: Redacted.make('token-abc'),
        tokenKind,
        rest: { baseUrl: 'https://discord.test/api/v10' },
      }),
    ),
    Layer.provide(FetchHttpClient.layer.pipe(Layer.provide(Layer.succeed(FetchHttpClient.Fetch, stub.fetch)))),
  );
  return { layer, requests: stub.requests };
};

const USER = { id: '1', username: 'dxos-bot', global_name: 'DXOS' };

describe('DiscordREST', () => {
  test('decodes a successful response and sends the configured credential', async () => {
    const { layer, requests } = testLayer([{ status: 200, body: USER }]);
    const user = await Effect.runPromise(
      Effect.flatMap(DiscordREST, (rest) => rest.getMyUser()).pipe(Effect.provide(layer)),
    );

    expect(user.username).toBe('dxos-bot');
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe('https://discord.test/api/v10/users/@me');
    expect(requests[0].headers.get('Authorization')).toBe('Bot token-abc');
  });

  test('sends user OAuth tokens under the Bearer scheme', async () => {
    const { layer, requests } = testLayer([{ status: 200, body: USER }], 'Bearer');
    await Effect.runPromise(Effect.flatMap(DiscordREST, (rest) => rest.getMyUser()).pipe(Effect.provide(layer)));

    expect(requests[0].headers.get('Authorization')).toBe('Bearer token-abc');
  });

  test('passes list options through as query parameters', async () => {
    const { layer, requests } = testLayer([{ status: 200, body: [] }]);
    await Effect.runPromise(
      Effect.flatMap(DiscordREST, (rest) => rest.listMessages('chan-1', { after: '42', limit: 100 })).pipe(
        Effect.provide(layer),
      ),
    );

    const url = new URL(requests[0].url);
    expect(url.pathname).toBe('/api/v10/channels/chan-1/messages');
    expect(url.searchParams.get('after')).toBe('42');
    expect(url.searchParams.get('limit')).toBe('100');
  });

  test('omits options the caller left unset', async () => {
    const { layer, requests } = testLayer([{ status: 200, body: [] }]);
    await Effect.runPromise(
      Effect.flatMap(DiscordREST, (rest) => rest.listMyGuilds({ limit: 200 })).pipe(Effect.provide(layer)),
    );

    const url = new URL(requests[0].url);
    expect(url.searchParams.get('limit')).toBe('200');
    expect(url.searchParams.has('after')).toBe(false);
  });

  test('retries a 429 for the interval Discord asks for, then succeeds', async () => {
    const { layer, requests } = testLayer([
      { status: 429, body: { message: 'rate limited', retry_after: 0.001 } },
      { status: 200, body: USER },
    ]);
    const user = await Effect.runPromise(
      Effect.flatMap(DiscordREST, (rest) => rest.getMyUser()).pipe(Effect.provide(layer)),
    );

    expect(user.id).toBe('1');
    expect(requests).toHaveLength(2);
  });

  test("surfaces a 4xx with Discord's error envelope intact", async () => {
    const { layer } = testLayer([{ status: 403, body: { code: 50001, message: 'Missing Access' } }]);
    const outcome = await Effect.runPromise(
      Effect.result(
        Effect.flatMap(DiscordREST, (rest) => rest.listGuildChannels('guild-1')).pipe(Effect.provide(layer)),
      ),
    );

    expect(outcome._tag).toBe('Failure');
    if (outcome._tag !== 'Failure') {
      return;
    }
    expect(isErrorResponse(outcome.failure)).toBe(true);
    expect(isMissingAccess(outcome.failure)).toBe(true);
    expect(isErrorResponse(outcome.failure) && outcome.failure.response.status).toBe(403);
  });

  test('gives up on a 429 once the attempt budget is spent', async () => {
    const { layer, requests } = testLayer([{ status: 429, body: { message: 'rate limited', retry_after: 0.001 } }]);
    const outcome = await Effect.runPromise(
      Effect.result(Effect.flatMap(DiscordREST, (rest) => rest.getMyUser()).pipe(Effect.provide(layer))),
    );

    expect(outcome._tag).toBe('Failure');
    expect(outcome._tag === 'Failure' && isRatelimited(outcome.failure)).toBe(true);
    expect(requests).toHaveLength(5);
  });

  test('tolerates a non-JSON error body', async () => {
    const layer = DiscordRESTLive.pipe(
      Layer.provide(
        DiscordConfig.layer({ token: Redacted.make('t'), rest: { baseUrl: 'https://discord.test/api/v10' } }),
      ),
      Layer.provide(
        FetchHttpClient.layer.pipe(
          Layer.provide(
            Layer.succeed(FetchHttpClient.Fetch, (() =>
              Promise.resolve(new Response('<html>gateway</html>', { status: 401 }))) as typeof globalThis.fetch),
          ),
        ),
      ),
    );
    const outcome = await Effect.runPromise(
      Effect.result(Effect.flatMap(DiscordREST, (rest) => rest.getMyUser()).pipe(Effect.provide(layer))),
    );

    expect(outcome._tag).toBe('Failure');
    expect(outcome._tag === 'Failure' && isErrorResponse(outcome.failure)).toBe(true);
  });
});
