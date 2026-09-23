//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Redacted from 'effect/Redacted';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { DecisionModel, TypeSafeClient } from '@dxos/ai-typesafe';
import { type EdgeAiService } from '@dxos/edge-client';
import { EffectEx } from '@dxos/effect';

import { EDGE_SENTINEL_ENDPOINT, makeEdgeFetch } from './edge-fetch.ts';

type AiCall = { service: EdgeAiService; request: Request };

/** Records what reaches EDGE and answers as System One would. */
const makeEdgeClient = (calls: AiCall[]) => ({
  aiRequest: async (service: EdgeAiService, request: Request) => {
    calls.push({ service, request });
    return Response.json({
      model: 'jev-1.13.0',
      answers: { urgent: { type: 'noul', noul: 0.9 } },
      usage: { input_tokens: 10, output_tokens: 1 },
    });
  },
});

const ask = (fetch: typeof globalThis.fetch, apiKey?: string) =>
  DecisionModel.generate({
    context: 'Help! My payouts have been failing for 3 days.',
    schema: Schema.Struct({ urgent: DecisionModel.Noul.annotate({ description: 'Is this urgent?' }) }),
  }).pipe(
    Effect.provide(
      TypeSafeClient.layer({
        endpoint: EDGE_SENTINEL_ENDPOINT,
        fetch,
        apiKey: apiKey ? Redacted.make(apiKey) : undefined,
      }),
    ),
  );

describe('makeEdgeFetch', () => {
  test('routes to the EDGE typesafe proxy on the platform key when nothing is connected', ({ expect }) =>
    EffectEx.runPromise(
      Effect.gen(function* () {
        const calls: AiCall[] = [];
        const result = yield* ask(makeEdgeFetch(() => makeEdgeClient(calls), undefined));

        expect(result.urgent).toBe(0.9);
        expect(calls).toHaveLength(1);
        expect(calls[0].service).toBe('typesafe');
        // `aiRequest` forwards only the path, onto `/ai/generate/typesafe/v1/systemone`.
        expect(new URL(calls[0].request.url).pathname).toBe('/v1/systemone');
        expect(calls[0].request.headers.get('x-byok')).toBeNull();
        expect(calls[0].request.headers.get('authorization')).toBeNull();
      }),
    ));

  test('sends a connected key as X-BYOK, never as Authorization', ({ expect }) =>
    EffectEx.runPromise(
      Effect.gen(function* () {
        const calls: AiCall[] = [];
        // Even if a key reached the client, EDGE owns `Authorization`.
        yield* ask(
          makeEdgeFetch(() => makeEdgeClient(calls), 'ts-user-key'),
          'ts-user-key',
        );

        expect(calls[0].request.headers.get('x-byok')).toBe('ts-user-key');
        expect(calls[0].request.headers.get('authorization')).toBeNull();
      }),
    ));
});
