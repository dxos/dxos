//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as HttpClient from 'effect/unstable/http/HttpClient';
import * as HttpClientResponse from 'effect/unstable/http/HttpClientResponse';
import { describe, test } from 'vitest';

import { CloudflareApi } from '#services';

const credentials = Layer.succeed(CloudflareApi.CloudflareCredentials, { token: 'cf-token' });

const stubHttpClient = (body: unknown, status = 200) => {
  const requests: { url: string; headers: Record<string, string> }[] = [];
  const layer = Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request) => {
      requests.push({ url: request.url, headers: request.headers as Record<string, string> });
      return Effect.succeed(HttpClientResponse.fromWeb(request, new Response(JSON.stringify(body), { status })));
    }),
  );
  return { layer, requests };
};

describe('CloudflareApi', () => {
  test('fetchAccounts unwraps the v4 envelope', async ({ expect }) => {
    const { layer, requests } = stubHttpClient({
      success: true,
      errors: [],
      messages: [],
      result: [{ id: 'acc-1', name: 'Acme' }],
    });

    const accounts = await CloudflareApi.fetchAccounts().pipe(
      Effect.provide(Layer.merge(layer, credentials)),
      Effect.runPromise,
    );

    expect(accounts).toEqual([{ id: 'acc-1', name: 'Acme' }]);
    expect(requests[0].url).toBe('https://api.cloudflare.com/client/v4/accounts');
    expect(requests[0].headers.authorization).toBe('Bearer cf-token');
  });

  test('fetchUser keeps the email', async ({ expect }) => {
    const { layer } = stubHttpClient({ result: { id: 'user-1', email: 'a@example.com' } });

    const user = await CloudflareApi.fetchUser().pipe(
      Effect.provide(Layer.merge(layer, credentials)),
      Effect.runPromise,
    );

    expect(user.email).toBe('a@example.com');
  });

  test('a 403 fails as an HTTP error, not a decode error', async ({ expect }) => {
    const { layer } = stubHttpClient({ success: false, errors: [{ code: 9109, message: 'Unauthorized' }] }, 403);

    const error = await CloudflareApi.fetchUser().pipe(
      Effect.flip,
      Effect.provide(Layer.merge(layer, credentials)),
      Effect.runPromise,
    );

    expect(error._tag).toBe('HttpClientError');
  });
});
