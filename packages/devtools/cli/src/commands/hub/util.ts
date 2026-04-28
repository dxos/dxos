//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as Config from 'effect/Config';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import path from 'node:path';

import { ConfigService } from '@dxos/client';
import { withRetry } from '@dxos/edge-client';
import { BaseError } from '@dxos/errors';
import { type EdgeEnvelope } from '@dxos/protocols';

export class HubApiError extends BaseError.extend('HubApiError', 'Hub API error') {}

const hubBaseUrl = Effect.gen(function* () {
  const config = yield* ConfigService;
  return config.values?.runtime?.services?.hub?.url ?? 'https://hub.dxos.network';
});

/**
 * Makes an authenticated request to the Hub API and unwraps the response envelope.
 */
export const hubApiRequest = <T>(
  method: 'GET' | 'POST' | 'DELETE',
  apiPath: string,
  options?: { body?: unknown; query?: Record<string, string> },
) =>
  Effect.gen(function* () {
    const apiKey = yield* Config.string('DX_HUB_API_KEY');
    const baseUrl = yield* hubBaseUrl;

    const url = new URL(path.join(baseUrl, apiPath));
    if (options?.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined && value !== '') {
          url.searchParams.set(key, value);
        }
      }
    }

    let request = HttpClientRequest.make(method)(url.toString()).pipe(
      HttpClientRequest.setHeader('x-api-key', apiKey),
    );
    if (options?.body !== undefined) {
      request = yield* HttpClientRequest.bodyJson(options.body)(request);
    }

    const result = yield* withRetry(HttpClient.execute(request), { timeout: Duration.seconds(30) }).pipe(
      Effect.provide(FetchHttpClient.layer),
    );

    const envelope = result as unknown as EdgeEnvelope<T>;
    if (!envelope.success) {
      yield* Effect.fail(new HubApiError({ message: envelope.message }));
    }
    return envelope.data as T;
  });

export const formatHubError = (error: unknown): string => {
  if (error instanceof HubApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    const parts = [error.message];
    if (error.cause instanceof Error) {
      parts.push(error.cause.message);
    }
    return parts.join(' ');
  }
  return String(error);
};
