//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as Config from 'effect/Config';
import * as Effect from 'effect/Effect';

import { withRetry } from '@dxos/edge-client';

class AdminApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdminApiError';
  }
}

/**
 * Makes an authenticated request to the Edge Admin API and unwraps the response envelope.
 */
export const adminRequest = (
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  options?: { query?: Record<string, string> },
) =>
  Effect.gen(function* () {
    const adminKey = yield* Config.string('DX_HUB_API_KEY');
    const baseUrl = yield* Config.string('DX_EDGE_BASE_URL');

    const url = new URL(path, baseUrl);
    if (options?.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined && value !== '') {
          url.searchParams.set(key, value);
        }
      }
    }

    const request = HttpClientRequest.make(method)(url.toString()).pipe(
      HttpClientRequest.setHeader('X-Admin-Key', adminKey),
    );

    const result = yield* withRetry(HttpClient.execute(request)).pipe(Effect.provide(FetchHttpClient.layer));

    const envelope = result as { success: boolean; data?: unknown; error?: { message: string } };
    if (!envelope.success) {
      yield* Effect.fail(new AdminApiError(envelope.error?.message ?? 'Unknown admin API error'));
    }

    return envelope.data;
  });

/**
 * Downloads a raw file from the Edge Admin API (no envelope unwrapping).
 */
export const adminDownload = (path: string) =>
  Effect.gen(function* () {
    const adminKey = yield* Config.string('DX_HUB_API_KEY');
    const baseUrl = yield* Config.string('DX_EDGE_BASE_URL');

    const url = new URL(path, baseUrl);
    const request = HttpClientRequest.get(url.toString()).pipe(HttpClientRequest.setHeader('X-Admin-Key', adminKey));

    const response = yield* HttpClient.execute(request).pipe(Effect.provide(FetchHttpClient.layer));

    if (response.status !== 200) {
      const body = yield* response.json;
      const envelope = body as { error?: string };
      yield* Effect.fail(new AdminApiError(envelope?.error ?? `HTTP ${response.status}`));
    }

    return response;
  });

/** Formats an error from the admin API for display. */
export const formatAdminError = (error: unknown): string => {
  if (error instanceof AdminApiError) {
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
