//
// Copyright 2026 DXOS.org
//

import * as HttpApi from '@effect/platform/HttpApi';
import * as HttpApiBuilder from '@effect/platform/HttpApiBuilder';
import * as HttpServer from '@effect/platform/HttpServer';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { afterEach, describe, test } from 'vitest';

import { StatusApiGroup } from '@dxos/edge-protocol';

import { checkEdgeApiHealth, makeEdgeApiClient } from './edge-api-client';
import { EdgeAuthChallengeError, EdgeRequestError } from './edge-api-errors';
import { EdgeApiService, mapEdgeErrors, withEdgeRetry } from './edge-client-service';
import { type EdgeIdentity } from './edge-identity';

// Same id as `EdgeApi` so this is a faithful (if smaller) stand-in for the real, full API.
const TestApi = HttpApi.make('edge').add(StatusApiGroup);

const TestApiLive = HttpApiBuilder.group(TestApi, 'status', (handlers) =>
  handlers
    .handle('health', () => Effect.succeed({ success: true as const, data: { status: 'ok' as const } }))
    .handle('auth', () => Effect.die('not implemented in this mock'))
    .handle('testTraceContext', () => Effect.die('not implemented in this mock'))
    .handle('systemStatus', () => Effect.die('not implemented in this mock')),
);

const ServerLive = HttpApiBuilder.api(TestApi).pipe(Layer.provide(TestApiLive));

const mockFetch: typeof fetch = async (input, init) => {
  const { handler } = HttpApiBuilder.toWebHandler(Layer.mergeAll(ServerLive, HttpServer.layerContext));
  return handler(new Request(input as any, init));
};

describe('EdgeApiClient (mocked transport)', () => {
  test('checkEdgeApiHealth round-trips through a real HttpApiBuilder server', async ({ expect }) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch;
    try {
      const result = await checkEdgeApiHealth('http://edge.test');
      expect(result).toEqual({ status: 'ok' });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('surfaces a decode failure for a malformed server response', async ({ expect }) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response('not json', { status: 200 });
    try {
      const exit = await Effect.gen(function* () {
        const client = yield* makeEdgeApiClient('http://edge.test');
        return yield* client.status.health();
      }).pipe(Effect.runPromiseExit);
      expect(exit._tag).toBe('Failure');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

const BASE_URL = 'http://edge.test';

const jsonResponse = (status: number, body: unknown, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

// Runs `health()` through the `EdgeApiService` layer + `mapEdgeErrors`, returning the resolved
// value or throwing the mapped error (via `Effect.flip` so failures surface as the success value).
const callHealth = (identity?: EdgeIdentity) =>
  Effect.gen(function* () {
    const { client } = yield* EdgeApiService;
    return yield* mapEdgeErrors(client.status.health());
  }).pipe(Effect.provide(EdgeApiService.layer({ baseUrl: BASE_URL, clientTag: 'test', identity })), Effect.runPromise);

const expectError = (identity?: EdgeIdentity) =>
  Effect.gen(function* () {
    const { client } = yield* EdgeApiService;
    return yield* mapEdgeErrors(client.status.health());
  }).pipe(
    Effect.flip,
    Effect.provide(EdgeApiService.layer({ baseUrl: BASE_URL, clientTag: 'test', identity })),
    Effect.runPromise,
  );

describe('EdgeApiService (auth + error mapping)', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('round-trips a success envelope through the service', async ({ expect }) => {
    globalThis.fetch = async () => jsonResponse(200, { success: true, data: { status: 'ok' } });
    expect(await callHealth()).toEqual({ success: true, data: { status: 'ok' } });
  });

  test('maps a non-enveloped HTTP 500 to a retryable EdgeRequestError', async ({ expect }) => {
    globalThis.fetch = async () => new Response('upstream boom', { status: 500 });
    const error = await expectError();
    expect(error).toBeInstanceOf(EdgeRequestError);
    expect((error as EdgeRequestError).isRetryable).toBe(true);
  });

  test('maps a graceful failure body, preserving data.type and 4xx non-retryability', async ({ expect }) => {
    globalThis.fetch = async () => jsonResponse(400, { success: false, message: 'slow down', data: { type: 'rate_limited' } });
    const error = await expectError();
    expect(error).toBeInstanceOf(EdgeRequestError);
    expect((error as EdgeRequestError).data?.type).toBe('rate_limited');
    expect((error as EdgeRequestError).isRetryable).toBe(false);
  });

  test('maps a graceful failure returned as HTTP 200 to a non-retryable EdgeRequestError', async ({ expect }) => {
    // Edge returns handled errors with status 200 and a `success:false` envelope.
    globalThis.fetch = async () => jsonResponse(200, { success: false, message: 'nope', data: { type: 'quota_exceeded' } });
    const error = await expectError();
    expect(error).toBeInstanceOf(EdgeRequestError);
    expect((error as EdgeRequestError).data?.type).toBe('quota_exceeded');
    expect((error as EdgeRequestError).isRetryable).toBe(false);
  });

  test('maps an auth_challenge body to EdgeAuthChallengeError', async ({ expect }) => {
    globalThis.fetch = async () =>
      jsonResponse(400, { success: false, message: 'challenge', data: { type: 'auth_challenge', challenge: 'Y2g=' } });
    const error = await expectError();
    expect(error).toBeInstanceOf(EdgeAuthChallengeError);
    expect((error as EdgeAuthChallengeError).challenge).toBe('Y2g=');
  });

  test('answers a WWW-Authenticate 401 challenge and retries once', async ({ expect }) => {
    const challenge = Buffer.from('challenge-bytes').toString('base64');
    let presented = 0;
    const identity: EdgeIdentity = {
      peerKey: 'peer',
      identityDid: 'did:halo:test',
      presentCredentials: async () => {
        presented++;
        return {} as any;
      },
    };
    globalThis.fetch = async (input, init) => {
      const authorization = new Headers(init?.headers).get('authorization');
      if (!authorization) {
        return new Response(JSON.stringify({ success: false, message: 'unauthorized' }), {
          status: 401,
          headers: { 'content-type': 'application/json', 'www-authenticate': `VerifiablePresentation challenge=${challenge}` },
        });
      }
      return jsonResponse(200, { success: true, data: { status: 'ok' } });
    };
    expect(await callHealth(identity)).toEqual({ success: true, data: { status: 'ok' } });
    expect(presented).toBe(1);
  });
});

describe('withEdgeRetry', () => {
  test('retries retryable errors up to the count then fails', async ({ expect }) => {
    let attempts = 0;
    const effect = Effect.suspend(() => {
      attempts++;
      return Effect.fail(new EdgeRequestError({ message: 'boom', isRetryable: true, retryAfterMs: 0 }));
    });
    const error = await withEdgeRetry(effect, { count: 2 }).pipe(Effect.flip, Effect.runPromise);
    expect(error).toBeInstanceOf(EdgeRequestError);
    expect(attempts).toBe(3); // Initial attempt + 2 retries.
  });

  test('does not retry non-retryable errors', async ({ expect }) => {
    let attempts = 0;
    const effect = Effect.suspend(() => {
      attempts++;
      return Effect.fail(new EdgeRequestError({ message: 'nope', isRetryable: false }));
    });
    await withEdgeRetry(effect, { count: 3 }).pipe(Effect.flip, Effect.runPromise);
    expect(attempts).toBe(1);
  });
});
