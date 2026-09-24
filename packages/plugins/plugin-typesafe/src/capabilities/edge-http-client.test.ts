//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Redacted from 'effect/Redacted';
import * as Schema from 'effect/Schema';
import * as Decision from 'effect/unstable/ai/Decision';
import * as HttpClient from 'effect/unstable/http/HttpClient';
import { afterEach, describe, test, vi } from 'vitest';

import { TypeSafeResolver } from '@dxos/ai/resolvers';
import { EdgeHttpClient } from '@dxos/edge-client';
import { EffectEx } from '@dxos/effect';

import { EDGE_ENDPOINT, WORKERS_AI_ENDPOINT, makeEdgeHttpClient } from './edge-http-client.ts';

const Urgency = Decision.make({
  input: Schema.String,
  decisions: { urgent: Decision.probability({ instructions: 'Is this urgent?' }) },
});

/** Answers every call as System One would, recording the ones that reach the model route. */
const stubFetch = () => {
  const calls: Request[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      if (new URL(request.url).pathname.endsWith('/systemone')) {
        calls.push(request);
      }
      return Response.json({ model: 'jev-1.13.0', answers: { urgent: { type: 'noul', noul: 0.9 } } });
    }),
  );
  return calls;
};

const ask = (apiKey: string | undefined, endpoint = EDGE_ENDPOINT) =>
  TypeSafeResolver.makeDecisionModel('jev-latest', {
    apiKey: Effect.succeed(apiKey ? Redacted.make(apiKey) : undefined),
    endpoint: () => endpoint,
  }).pipe(
    Effect.flatMap((model) => model.decide(Urgency, { input: 'Payouts failing for 3 days' })),
    Effect.provide(
      Layer.succeed(
        HttpClient.HttpClient,
        makeEdgeHttpClient(() => new EdgeHttpClient('https://edge.test')),
      ),
    ),
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('makeEdgeHttpClient', () => {
  test('routes to the EDGE typesafe proxy on the platform key when nothing is connected', ({ expect }) =>
    EffectEx.runPromise(
      Effect.gen(function* () {
        const calls = stubFetch();
        const response = yield* ask(undefined);

        expect(response.answers.urgent.probability).toBe(0.9);
        expect(calls.map((request) => request.url)).toEqual(['https://edge.test/ai/generate/typesafe/v1/systemone']);
        expect(calls[0].headers.get('x-byok')).toBeNull();
      }),
    ));

  test('moves a connected key from Authorization to X-BYOK, since EDGE owns Authorization', ({ expect }) =>
    EffectEx.runPromise(
      Effect.gen(function* () {
        const calls = stubFetch();
        yield* ask('ts-user-key');

        expect(calls[0].headers.get('x-byok')).toBe('ts-user-key');
        expect(calls[0].headers.get('authorization')).not.toBe('Bearer ts-user-key');
      }),
    ));

  test("routes the Workers AI endpoint to EDGE's workers-ai route without the vendor key", ({ expect }) =>
    EffectEx.runPromise(
      Effect.gen(function* () {
        const calls = stubFetch();
        const response = yield* ask('ts-user-key', WORKERS_AI_ENDPOINT);

        expect(response.answers.urgent.probability).toBe(0.9);
        expect(calls.map((request) => request.url)).toEqual([
          'https://edge.test/ai/generate/workers-ai/typesafe/v1/systemone',
        ]);
        expect(calls[0].headers.get('x-byok')).toBeNull();
        expect(calls[0].headers.get('authorization')).not.toBe('Bearer ts-user-key');
      }),
    ));
});
