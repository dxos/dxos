//
// Copyright 2026 DXOS.org
//

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as Cause from 'effect/Cause';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import { describe, test } from 'vitest';

import { FunctionsAiMemoizationMissError, FunctionsAiUpstreamError } from '@dxos/compute';
import { EffectEx } from '@dxos/effect';
import { type EdgeFunctionEnv } from '@dxos/protocols';

import { FunctionsAiHttpClient } from './functions-ai-http-client';

const makeStubService = (response: Response): EdgeFunctionEnv.FunctionsAiService => ({
  fetch: async () => response as any,
});

const runRequest = (service: EdgeFunctionEnv.FunctionsAiService) =>
  HttpClient.HttpClient.pipe(
    Effect.flatMap((client) =>
      client.execute(HttpClientRequest.post('http://internal/provider/anthropic/v1/messages')),
    ),
    Effect.provide(FunctionsAiHttpClient.layer(service)),
  );

const extractDefect = (exit: Exit.Exit<unknown, unknown>): Error | null => {
  if (Exit.isSuccess(exit)) {
    return null;
  }
  return (Chunk.toReadonlyArray(Cause.defects(exit.cause))[0] as Error | undefined) ?? null;
};

describe('FunctionsAiHttpClient', () => {
  test('emits FunctionsAiMemoizationMissError when upstream returns the memoization_miss envelope', async ({
    expect,
  }) => {
    const service = makeStubService(
      new Response(
        JSON.stringify({
          type: 'error',
          error: {
            type: 'memoization_miss',
            message: 'No memoized Anthropic conversation found for POST /v1/messages (key=abc).',
            cacheKey: 'abc',
          },
        }),
        { status: 500, headers: { 'content-type': 'application/json' } },
      ),
    );

    const exit = await Effect.runPromiseExit(runRequest(service));
    const error = extractDefect(exit);
    expect(error).toBeInstanceOf(FunctionsAiMemoizationMissError);
    expect(error?.name).toBe('FunctionsAiMemoizationMissError');
    expect((error as any)?.context?.cacheKey).toBe('abc');
    expect((error as any)?.context?.status).toBe(500);
  });

  test('emits FunctionsAiUpstreamError for generic JSON error envelopes', async ({ expect }) => {
    const service = makeStubService(
      new Response(
        JSON.stringify({
          type: 'error',
          error: { type: 'overloaded_error', message: 'Server overloaded.' },
        }),
        { status: 529, headers: { 'content-type': 'application/json' } },
      ),
    );

    const exit = await Effect.runPromiseExit(runRequest(service));
    const error = extractDefect(exit);
    expect(error).toBeInstanceOf(FunctionsAiUpstreamError);
    expect((error as any)?.context?.type).toBe('overloaded_error');
    expect((error as any)?.context?.status).toBe(529);
  });

  test('passes non-error responses through unchanged', async ({ expect }) => {
    const service = makeStubService(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const result = await EffectEx.runAndForwardErrors(runRequest(service));
    expect(result.status).toBe(200);
  });

  test('passes non-JSON 5xx responses through to the @effect/ai layer unchanged', async ({ expect }) => {
    const service = makeStubService(
      new Response('Internal Server Error', {
        status: 500,
        headers: { 'content-type': 'text/plain' },
      }),
    );

    const result = await EffectEx.runAndForwardErrors(runRequest(service));
    expect(result.status).toBe(500);
  });
});
