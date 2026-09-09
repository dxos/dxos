//
// Copyright 2026 DXOS.org
//

import * as Config from 'effect/Config';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';
import * as HttpClient from 'effect/unstable/http/HttpClient';
import * as HttpClientRequest from 'effect/unstable/http/HttpClientRequest';
import path from 'node:path';

import { ConfigService } from '@dxos/client';
import { withRetry } from '@dxos/edge-client';
import { BaseError } from '@dxos/errors';
import { type EdgeEnvelope } from '@dxos/protocols';

export class HubApiError extends BaseError.extend('HubApiError', 'Hub API error') {}

/** Loopback hosts a `wrangler dev` EDGE answers on, where cleartext never leaves the machine. */
const LOOPBACK_HOSTNAMES = ['localhost', '127.0.0.1', '[::1]'];

/** EDGE proxies hub-service under `/hub`, so the admin API is addressed off the profile's EDGE URL. */
const hubBaseUrl = Effect.gen(function* () {
  const config = yield* ConfigService;
  const url = config.values?.runtime?.services?.edge?.url;
  if (!url) {
    // The CLI writes an EDGE URL into every profile it creates, so an absent one means the profile
    // was edited — report that rather than silently substituting a DXOS-operated host.
    return yield* Effect.fail(new HubApiError({ message: 'EDGE URL is not configured (runtime.services.edge.url).' }));
  }
  const baseUrl = new URL('hub/', url.endsWith('/') ? url : `${url}/`);
  // Every request below presents the admin API key, so refuse to put it on the wire in cleartext;
  // a local EDGE is the one case where http never leaves the machine.
  if (baseUrl.protocol !== 'https:' && !LOOPBACK_HOSTNAMES.includes(baseUrl.hostname)) {
    return yield* Effect.fail(
      new HubApiError({
        message: `Refusing to send the hub admin key over ${baseUrl.protocol} to ${baseUrl.hostname}; configure an https EDGE URL.`,
      }),
    );
  }
  return baseUrl.toString();
});

/**
 * Makes an authenticated request to the Hub API and unwraps the response envelope.
 *
 * Uses admin API-key auth (`DX_HUB_API_KEY`) for privileged CLI operations.
 * User-facing hub calls use VP auth via `EdgeHttpClient` in `@dxos/edge-client`.
 * TODO(wittjosiah): Reconcile with hub client.
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

    let request = HttpClientRequest.make(method)(url.toString()).pipe(HttpClientRequest.setHeader('x-api-key', apiKey));
    if (options?.body !== undefined) {
      request = yield* HttpClientRequest.bodyJson(options.body)(request);
    }

    const result = yield* withRetry(HttpClient.execute(request), { timeout: Duration.seconds(30) }).pipe(
      Effect.provide(FetchHttpClient.layer),
    );

    const envelope = result as unknown as EdgeEnvelope<T>;
    if (!envelope.success) {
      return yield* Effect.fail(new HubApiError({ message: envelope.message }));
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
