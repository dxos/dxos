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

import { log } from '@dxos/log';

import { type EdgeHttpClient } from './edge-http-client';

export type GetEdgeHttpClient = () => EdgeHttpClient;

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
        }).pipe(Effect.map((response) => HttpClientResponse.fromWeb(request, response)));

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
