//
// Copyright 2025 DXOS.org
//

import { FetchHttpClient, HttpClient } from '@effect/platform';
import { type HttpClientError } from '@effect/platform/HttpClientError';
import { type HttpClientResponse } from '@effect/platform/HttpClientResponse';
import { Duration, Effect, pipe, Schedule } from 'effect';
import http from 'http';
import { afterEach, describe, it } from 'vitest';

import { log } from '@dxos/log';

import { EdgeHttpClient } from './edge-http-client';

type RetryOptions = {
  timeout: number;
  exponential: number;
  times: number;
};

const withRetry = (
  effect: Effect.Effect<HttpClientResponse, HttpClientError, HttpClient.HttpClient>,
  { timeout = 1_000, exponential = 1_000, times = 3 }: Partial<RetryOptions> = {},
) => {
  return effect.pipe(
    // TODO(burdon): OTEL.
    Effect.withSpan('EdgeHttpClient'),
    // Effect.tap((response) => Effect.log(response.status)),
    Effect.tap((res) => log.info('response', { status: res.status })),
    Effect.flatMap((res) =>
      // Treat 500 errors as retryable?
      res.status === 500 ? Effect.fail(new Error(res.status.toString())) : res.json,
    ),
    Effect.timeout(Duration.millis(timeout)),
    Effect.retry({
      schedule: Schedule.exponential(Duration.millis(exponential)).pipe(Schedule.jittered),
      times,
    }),
  );
};

describe.skipIf(process.env.CI)('EdgeHttpClient', () => {
  let server: TestServer | undefined;
  afterEach(() => {
    server?.close();
    server = undefined;
  });

  // TODO(burdon): Auth headers.
  // TODO(burdon): Add request/response schema type checking.
  it('should retry with effect', async ({ expect }) => {
    const server = await createTestServer(responseHandler((attempt) => (attempt > 2 ? { value: 100 } : false)));
    const httpLayer = Effect.provide(FetchHttpClient.layer); // TODO(burdon): Swap to mock.
    const result = await pipe(withRetry(HttpClient.get(server.url)), httpLayer, Effect.runPromise);
    expect(result).toMatchObject({ success: true, data: { value: 100 } });
  });

  it('should retry', async ({ expect }) => {
    const server = await createTestServer(responseHandler((attempt) => (attempt > 1 ? {} : false)));
    const client = new EdgeHttpClient(server.url);
    const result = await client.getStatus({ retry: { count: 2 } });
    expect(result).toBeDefined();
  });

  it('should get status', async ({ expect }) => {
    const server = await createTestServer(responseHandler((attempt) => ({ status: 'ok' })));
    const client = new EdgeHttpClient(server.url);
    const result = await client.getStatus();
    expect(result).toBeDefined();
  });
});

type TestServer = {
  url: string;
  close: () => void;
};

type ResponseHandler = (req: http.IncomingMessage, res: http.ServerResponse) => void;

export const createTestServer = (responseHandler: ResponseHandler) => {
  const server = http.createServer(responseHandler);

  return new Promise<TestServer>((resolve) => {
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolve({
        url: `http://localhost:${port}`,
        close: () => server.close(),
      });
    });
  });
};

const responseHandler = (cb: (attempt: number) => false | object): ResponseHandler => {
  let attempt = 0;
  return (req, res) => {
    const data = cb(++attempt) ?? {};
    if (data === false) {
      log('simulating failure', { attempt });
      res.statusCode = 500;
      res.statusMessage = 'Simulating failure';
      res.end('');
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data }));
    }
  };
};
