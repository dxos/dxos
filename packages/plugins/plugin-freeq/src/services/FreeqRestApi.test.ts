//
// Copyright 2026 DXOS.org
//

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientResponse from '@effect/platform/HttpClientResponse';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { FreeqConnectionError } from '../errors';
import { FreeqRestApi } from './index';

const stubHttpClient = (body: unknown) =>
  Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request) =>
      Effect.succeed(HttpClientResponse.fromWeb(request, new Response(JSON.stringify(body), { status: 200 }))),
    ),
  );

describe('FreeqRestApi', () => {
  test('httpBaseFromWs converts wss to https', ({ expect }) => {
    expect(FreeqRestApi.httpBaseFromWs('wss://freeq.example')).toBe('https://freeq.example');
    expect(FreeqRestApi.httpBaseFromWs('ws://localhost:6680')).toBe('http://localhost:6680');
  });

  test('getMessages maps the REST payload', async ({ expect }) => {
    const messages = await FreeqRestApi.getMessages({ httpBase: 'https://freeq.example', channel: '#general' }).pipe(
      Effect.provide(stubHttpClient({ messages: [{ id: 'm1', nick: 'bob', text: 'hi', ts: 1700000000000 }] })),
      Effect.runPromise,
    );
    expect(messages).toEqual([{ id: 'm1', nick: 'bob', text: 'hi', ts: 1700000000000 }]);
  });

  test('getMessages fails with FreeqConnectionError (not a decode error) on a non-2xx response', async ({ expect }) => {
    const httpClient = Layer.succeed(
      HttpClient.HttpClient,
      HttpClient.make((request) =>
        Effect.succeed(HttpClientResponse.fromWeb(request, new Response('{"error":"not found"}', { status: 404 }))),
      ),
    );

    const error = await FreeqRestApi.getMessages({ httpBase: 'https://freeq.example', channel: '#general' }).pipe(
      Effect.flip,
      Effect.provide(httpClient),
      Effect.runPromise,
    );

    expect(error).toBeInstanceOf(FreeqConnectionError);
  });
});
