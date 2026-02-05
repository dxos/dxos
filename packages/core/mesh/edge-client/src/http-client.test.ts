//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as HttpClient from '@effect/platform/HttpClient';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import { afterEach, beforeEach, describe, it } from 'vitest';

import { runAndForwardErrors } from '@dxos/effect';
import { invariant } from '@dxos/invariant';

import { HttpConfig, withLogging, withRetry, withRetryConfig } from './http-client';
import { type TestServer, createTestServer, responseHandler } from './testing';

describe('HttpClient', () => {
  let server: TestServer | undefined;

  beforeEach(async () => {
    server = await createTestServer(responseHandler((attempt) => (attempt > 2 ? { value: 100 } : false)));
  });

  afterEach(() => {
    server?.close();
    server = undefined;
  });

  // TODO(burdon): Auth headers/API key for admin.
  // TODO(burdon): Add request/response schema type checking.
  // TODO(burdon): Test swarm.
  it.skipIf(process.env.CI)('should retry', async ({ expect }) => {
    invariant(server);

    {
      const result = await Function.pipe(
        withRetry(HttpClient.get(server.url)),
        Effect.provide(FetchHttpClient.layer),
        Effect.withSpan('EdgeHttpClient'),
        runAndForwardErrors,
      );
      expect(result).toMatchObject({ success: true, data: { value: 100 } });
    }

    {
      const result = await Function.pipe(
        HttpClient.get(server.url),
        withLogging,
        withRetryConfig,
        Effect.provide(FetchHttpClient.layer),
        Effect.provide(HttpConfig.default), // TODO(burdon): Swap out to mock.
        Effect.withSpan('EdgeHttpClient'), // TODO(burdon): OTEL.
        runAndForwardErrors,
      );
      expect(result).toMatchObject({ success: true, data: { value: 100 } });
    }
  });
});
