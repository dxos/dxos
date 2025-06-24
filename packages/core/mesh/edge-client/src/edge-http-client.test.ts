//
// Copyright 2025 DXOS.org
//

import { FetchHttpClient, HttpClient } from '@effect/platform';
import { Duration, Effect, pipe, Schedule } from 'effect';
import http from 'http';
import { afterEach, describe, it } from 'vitest';

import { log } from '@dxos/log';

import { EdgeHttpClient } from './edge-http-client';

/**
 * Create a fetch effect.
 */
const makeGet = (url: string) =>
  HttpClient.get(url).pipe(
    Effect.withSpan('EdgeHttpClient'), // TODO(burdon): OTEL.
    // Effect.tap((response) => Effect.log(response.status)),
    Effect.tap((response) => log.info('response', { status: response.status })),
    Effect.flatMap((response) =>
      // Treat 500 errors as retryable?
      response.status === 500 ? Effect.fail(new Error(response.status.toString())) : response.json,
    ),
    Effect.timeout('1 second'),
    Effect.retry({ schedule: Schedule.exponential(Duration.millis(1_000)).pipe(Schedule.jittered), times: 3 }),
  );

describe('EdgeHttpClient', () => {
  let server: TestServer | undefined;
  afterEach(() => {
    server?.close();
    server = undefined;
  });

  // TODO(burdon): Auth headers.
  // TODO(burdon): Add request/response schema type checking.
  it('should retry with effect', async ({ expect }) => {
    const server = await createTestServer(responseHandler((attempt) => (attempt > 1 ? { value: 100 } : false)));
    const httpLayer = Effect.provide(FetchHttpClient.layer); // TODO(burdon): Swap to mock.
    const result = await pipe(makeGet(server.url), httpLayer, Effect.runPromise);
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
