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

/** Captures the outgoing request so a test can assert on it, and answers with `body` at `status`. */
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
    // Through the proxy, and with the credential in the header the proxy forwards — a bare
    // `Authorization` would be read as the proxy's own and never reach Cloudflare.
    expect(requests[0].url).toBe('https://dxos.network/cors-proxy/api.cloudflare.com/client/v4/accounts');
    expect(requests[0].headers['x-cors-proxy-authorization']).toBe('Bearer cf-token');
    expect(requests[0].headers.authorization).toBeUndefined();
  });

  test('fetchUser keeps the email', async ({ expect }) => {
    const { layer } = stubHttpClient({ result: { id: 'user-1', email: 'a@example.com' } });

    const user = await CloudflareApi.fetchUser().pipe(
      Effect.provide(Layer.merge(layer, credentials)),
      Effect.runPromise,
    );

    expect(user.email).toBe('a@example.com');
  });

  // The 403 body has no `result`, so decoding it against the success schema would fail with a
  // SchemaError and bury the real cause. `filterStatusOk` has to reject it first.
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
