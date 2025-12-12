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

import { type EdgeFunctionEnv } from '@dxos/protocols';
/**
 * Copy pasted from https://github.com/Effect-TS/effect/blob/main/packages/platform/src/internal/fetchHttpClient.ts
 */
export const requestInitTagKey = '@effect/platform/FetchHttpClient/FetchOptions';

export class FunctionsAiHttpClient {
  static make = (aiService: EdgeFunctionEnv.AiService) =>
    HttpClient.make((request, url, signal, fiber) => {
      const context = fiber.getFiberRef(FiberRef.currentContext);
      const options: RequestInit = context.unsafeMap.get(requestInitTagKey) ?? {};
      const headers = options.headers
        ? Headers.merge(Headers.fromInput(options.headers), request.headers)
        : request.headers;

      const send = (body: BodyInit | undefined) =>
        Effect.tryPromise({
          try: () =>
            aiService.proxyFetch(
              {}, // ExecutionContext
              new Request(url, {
                ...options,
                method: request.method,
                headers,
                body,
                duplex: request.body._tag === 'Stream' ? 'half' : undefined,
                signal,
              } as any),
            ),
          catch: (cause) =>
            new HttpClientError.RequestError({
              request,
              reason: 'Transport',
              cause,
            }),
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

  static layer = (aiService: EdgeFunctionEnv.AiService) =>
    Layer.succeed(HttpClient.HttpClient, FunctionsAiHttpClient.make(aiService));
}
