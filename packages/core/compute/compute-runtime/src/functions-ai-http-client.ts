//
// Copyright 2025 DXOS.org
//

import * as Headers from '@effect/platform/Headers';
import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientError from '@effect/platform/HttpClientError';
import * as HttpClientResponse from '@effect/platform/HttpClientResponse';
import * as Effect from 'effect/Effect';
import * as FiberRef from 'effect/FiberRef';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';

import { FunctionsAiMemoizationMissError, FunctionsAiUpstreamError } from '@dxos/compute';
import { log } from '@dxos/log';
import { type EdgeFunctionEnv, ErrorCodec } from '@dxos/protocols';

/**
 * Copy pasted from https://github.com/Effect-TS/effect/blob/main/packages/platform/src/internal/fetchHttpClient.ts
 */
export const requestInitTagKey = '@effect/platform/FetchHttpClient/FetchOptions';

/**
 * Shape of the JSON error envelope emitted by the upstream AI gateway (and by the memoization
 * layer that fronts it in test environments).
 *
 * @example
 * ```json
 * {
 *   "type": "error",
 *   "error": {
 *     "type": "memoization_miss",
 *     "message": "No memoized Anthropic conversation found for ...",
 *     "cacheKey": "114dae3db8fe60..."
 *   }
 * }
 * ```
 */
type UpstreamErrorEnvelope = {
  type?: string;
  error?: {
    type?: string;
    message?: string;
    cacheKey?: string;
  };
};

export class FunctionsAiHttpClient {
  static make = (service: EdgeFunctionEnv.FunctionsAiService) =>
    HttpClient.make((request, url, signal, fiber) => {
      const context = fiber.getFiberRef(FiberRef.currentContext);
      const options: RequestInit = context.unsafeMap.get(requestInitTagKey) ?? {};
      const headers = options.headers
        ? Headers.merge(Headers.fromInput(options.headers), request.headers)
        : request.headers;

      const send = (body: BodyInit | undefined) =>
        Effect.tryPromise({
          try: () =>
            service.fetch(
              new Request(url, {
                ...options,
                method: request.method,
                headers,
                body,
                // Note: Don't pass signal - it can't be serialized through RPC
              }),
            ),
          catch: (cause) => {
            log.error('Failed to fetch', { errorSerialized: ErrorCodec.encode(cause as Error) });
            return new HttpClientError.RequestError({
              request,
              reason: 'Transport',
              cause,
            });
          },
        }).pipe(
          Effect.flatMap((response) =>
            // Inspect the body before handing the response to `@effect/ai` so that structured
            // upstream errors surface as typed defects (`FunctionsAiUpstreamError` and friends)
            // rather than as the generic `HttpResponseError` from `@effect/ai/AiError`.
            Effect.flatMap(
              Effect.promise(() => parseUpstreamError(response)),
              (typedError) =>
                typedError ? Effect.die(typedError) : Effect.succeed(HttpClientResponse.fromWeb(request, response)),
            ),
          ),
        );

      switch (request.body._tag) {
        case 'Raw':
        case 'Uint8Array':
          return send(request.body.body as any);
        case 'FormData':
          return send(request.body.formData);
        case 'Stream':
          return Stream.toReadableStreamEffect(request.body.stream).pipe(Effect.flatMap(send));
      }

      return send(undefined);
    });

  static layer = (service: EdgeFunctionEnv.FunctionsAiService) =>
    Layer.succeed(HttpClient.HttpClient, FunctionsAiHttpClient.make(service));
}

/**
 * Returns a typed error if the response is a non-2xx JSON payload matching
 * {@link UpstreamErrorEnvelope}; otherwise returns `undefined` and the response is forwarded
 * unchanged.
 */
const parseUpstreamError = async (response: Response): Promise<Error | undefined> => {
  if (response.ok) {
    return undefined;
  }
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return undefined;
  }
  let body: UpstreamErrorEnvelope;
  try {
    body = (await response.clone().json()) as UpstreamErrorEnvelope;
  } catch {
    return undefined;
  }
  if (!body || body.type !== 'error' || typeof body.error !== 'object' || body.error === null) {
    return undefined;
  }
  const inner = body.error;
  const message = inner.message ?? `Upstream AI service responded with HTTP ${response.status}`;
  if (inner.type === 'memoization_miss' && typeof inner.cacheKey === 'string') {
    return new FunctionsAiMemoizationMissError({
      message,
      context: { cacheKey: inner.cacheKey, status: response.status },
    });
  }
  return new FunctionsAiUpstreamError({
    message,
    context: { type: inner.type, status: response.status, ...(inner.cacheKey ? { cacheKey: inner.cacheKey } : {}) },
  });
};
