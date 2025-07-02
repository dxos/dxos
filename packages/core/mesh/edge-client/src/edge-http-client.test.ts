//
// Copyright 2025 DXOS.org
//

import { FetchHttpClient, HttpClient } from '@effect/platform';
import { type HttpClientError } from '@effect/platform/HttpClientError';
import { type HttpClientResponse } from '@effect/platform/HttpClientResponse';
import { Context, Duration, Effect, Layer, pipe, Schedule } from 'effect';
import http from 'http';
import { afterEach, describe, it } from 'vitest';

import { log } from '@dxos/log';

import { EdgeHttpClient } from './edge-http-client';
import { createEphemeralEdgeIdentity } from './auth';

type RetryOptions = {
  timeout: Duration.Duration;
  retryTimes: number;
  retryBaseDelay: Duration.Duration;
};

// HOC pattern.
const withRetry = (
  effect: Effect.Effect<HttpClientResponse, HttpClientError, HttpClient.HttpClient>,
  {
    timeout = Duration.millis(1_000),
    retryBaseDelay = Duration.millis(1_000),
    retryTimes = 3,
  }: Partial<RetryOptions> = {},
) => {
  return effect.pipe(
    Effect.flatMap((res) =>
      // Treat 500 errors as retryable?
      res.status === 500 ? Effect.fail(new Error(res.status.toString())) : res.json,
    ),
    Effect.timeout(timeout),
    Effect.retry({
      schedule: Schedule.exponential(retryBaseDelay).pipe(Schedule.jittered),
      times: retryTimes,
    }),
  );
};

const withLogging = <A extends HttpClientResponse, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(Effect.tap((res) => log.info('response', { status: res.status })));

// Layer pattern.
export class HttpConfig extends Context.Tag('HttpConfig')<HttpConfig, RetryOptions>() {
  static default = Layer.succeed(HttpConfig, {
    timeout: Duration.millis(1_000),
    retryTimes: 3,
    retryBaseDelay: Duration.millis(1_000),
  });
}

const withRetryConfig = (effect: Effect.Effect<HttpClientResponse, HttpClientError, HttpClient.HttpClient>) =>
  Effect.gen(function* () {
    const config = yield* HttpConfig;
    return yield* withRetry(effect, config);
  });

describe.skipIf(process.env.CI)('EdgeHttpClient', () => {
  let server: TestServer | undefined;
  // eslint-disable-next-line mocha/no-top-level-hooks
  afterEach(() => {
    server?.close();
    server = undefined;
  });

  it.only('should get status', async ({ expect }) => {
    const identity = await createEphemeralEdgeIdentity();
    const url = 'http://localhost:8787';
    const edgeHttp = new EdgeHttpClient(url);
    edgeHttp.setIdentity(identity);

    const result = await edgeHttp.getStatus();
    log.info('result', { result });
    expect(result).toBeDefined();
  });

  // TODO(burdon): Auth headers.
  // TODO(burdon): Add request/response schema type checking.
  it('should retry with effect', async ({ expect }) => {
    const server = await createTestServer(responseHandler((attempt) => (attempt > 2 ? { value: 100 } : false)));
    const result = await pipe(
      withRetry(HttpClient.get(server.url)),
      Effect.provide(FetchHttpClient.layer),
      Effect.withSpan('EdgeHttpClient'),
      Effect.runPromise,
    );
    expect(result).toMatchObject({ success: true, data: { value: 100 } });
  });

  it('should retry with effect (alt)', async ({ expect }) => {
    const server = await createTestServer(responseHandler((attempt) => (attempt > 2 ? { value: 100 } : false)));
    const result = await pipe(
      HttpClient.get(server.url),
      withLogging,
      withRetryConfig,
      Effect.provide(FetchHttpClient.layer),
      Effect.provide(HttpConfig.default), // TODO(burdon): Swap out to mock.
      Effect.withSpan('EdgeHttpClient'), // TODO(burdon): OTEL.
      Effect.runPromise,
    );
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
