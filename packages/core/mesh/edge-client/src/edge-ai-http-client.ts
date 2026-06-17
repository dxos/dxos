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

import { BaseError, type BaseErrorOptions } from '@dxos/errors';
import { log } from '@dxos/log';
import { BYOK_HEADER } from '@dxos/protocols';

import { type EdgeHttpClient } from './edge-http-client';

export type GetEdgeHttpClient = () => EdgeHttpClient;

/**
 * Thrown by {@link EdgeAiHttpClient} when an AI request carrying {@link BYOK_HEADER} is rejected
 * with 401/403 by the upstream provider — i.e. the user-supplied API key is invalid. Wrapped as
 * the `cause` of an `HttpClientError.ResponseError` so it flows through `@effect/ai`'s error
 * mapping; callers walk the cause chain (via {@link ByokError.is}) to render a useful message.
 */
export class ByokError extends BaseError.extend('ByokError', 'BYOK authentication failed') {
  constructor(options: { status: number; provider: string } & BaseErrorOptions) {
    super({ context: { status: options.status, provider: options.provider }, ...options });
  }
}

/**
 * Thrown by {@link EdgeAiHttpClient} when EDGE rejects an AI request with 429 because the
 * authenticated profile exceeded a metering limit. Wrapped as the `cause` of an
 * {@link HttpClientError.ResponseError} so it survives `@effect/ai`'s error mapping.
 */
export class UsageQuotaExceededError extends BaseError.extend('UsageQuotaExceededError', 'Usage quota exceeded') {}

/**
 * Copy pasted from https://github.com/Effect-TS/effect/blob/main/packages/platform/src/internal/fetchHttpClient.ts
 */
export const requestInitTagKey = '@effect/platform/FetchHttpClient/FetchOptions';

/**
 * An `@effect/platform` {@link HttpClient.HttpClient} that routes requests through the
 * authenticated EDGE AI endpoint via {@link EdgeHttpClient.anthropicAiRequest}, instead of
 * fetching the AI service directly.
 *
 * Provide this layer in place of `FetchHttpClient.layer` when constructing an Anthropic client,
 * e.g. `AnthropicClient.layer({ apiUrl: 'http://edge' }).pipe(Layer.provide(EdgeAiHttpClient.layer(() => edgeClient)))`.
 * The `apiUrl` host is a sentinel; only the request path is forwarded (see `anthropicAiRequest`).
 *
 * Modeled on `FunctionsAiHttpClient` in `@dxos/functions`.
 */
export class EdgeAiHttpClient {
  static make = (getClient: GetEdgeHttpClient) =>
    HttpClient.make((request, url, signal, fiber) => {
      const edgeClient = getClient();
      const context = fiber.getFiberRef(FiberRef.currentContext);
      const options: RequestInit = context.unsafeMap.get(requestInitTagKey) ?? {};
      const headers = options.headers
        ? Headers.merge(Headers.fromInput(options.headers), request.headers)
        : request.headers;

      const carriedByok = !!headers[BYOK_HEADER.toLowerCase()];

      const send = (body: BodyInit | undefined) =>
        Effect.tryPromise({
          try: () =>
            edgeClient.anthropicAiRequest(
              new Request(url, {
                ...options,
                method: request.method,
                headers,
                body,
                signal,
              }),
            ),
          catch: (cause) => {
            log.error('Failed to fetch', { cause });
            return new HttpClientError.RequestError({
              request,
              reason: 'Transport',
              cause,
            });
          },
        }).pipe(
          Effect.flatMap((response) => {
            const httpResponse = HttpClientResponse.fromWeb(request, response);
            // A 401/403 on a BYOK-carrying request means the user's upstream key was rejected.
            // Wrap as a typed ResponseError with `cause: ByokError` so it survives AiError's
            // `fromRequestError` mapping; callers walk the cause chain to render a useful message.
            if (carriedByok && (response.status === 401 || response.status === 403)) {
              return Effect.tryPromise({
                try: () => response.clone().json() as Promise<{ error?: { message?: string } } | undefined>,
                catch: () => undefined,
              }).pipe(
                Effect.orElseSucceed(() => undefined),
                Effect.flatMap((body) =>
                  Effect.fail(
                    new HttpClientError.ResponseError({
                      request,
                      response: httpResponse,
                      reason: 'StatusCode',
                      cause: new ByokError({
                        status: response.status,
                        provider: 'anthropic.com',
                        message: body?.error?.message ?? 'Authentication failed',
                      }),
                    }),
                  ),
                ),
              );
            }
            // Platform quota (not BYOK): reserve/commit rejected the request before upstream AI.
            if (!carriedByok && response.status === 429) {
              return Effect.tryPromise({
                try: () => response.clone().json() as Promise<{ error?: { message?: string } } | undefined>,
                catch: () => undefined,
              }).pipe(
                Effect.orElseSucceed(() => undefined),
                Effect.flatMap((body) =>
                  Effect.fail(
                    new HttpClientError.ResponseError({
                      request,
                      response: httpResponse,
                      reason: 'StatusCode',
                      cause: new UsageQuotaExceededError({
                        message: body?.error?.message,
                      }),
                    }),
                  ),
                ),
              );
            }
            return Effect.succeed(httpResponse);
          }),
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

  static layer = (getClient: GetEdgeHttpClient) =>
    Layer.succeed(HttpClient.HttpClient, EdgeAiHttpClient.make(getClient));
}
