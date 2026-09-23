//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as Decision from 'effect/unstable/ai/Decision';
import * as DecisionModel from 'effect/unstable/ai/DecisionModel';
import { afterEach, describe, test, vi } from 'vitest';

import * as Credential from '@dxos/compute/Credential';
import { EdgeHttpClient } from '@dxos/edge-client';
import { EffectEx } from '@dxos/effect';

import { TYPESAFE_SOURCE } from '../constants.ts';
import { providerLayer } from './layer-specs.ts';

const Urgency = Decision.make({
  input: Schema.Struct({ subject: Schema.String }),
  decisions: {
    urgent: Decision.probability({ instructions: 'Is this urgent?' }),
  },
});

const credentialsLayer = (apiKey?: string) =>
  Layer.succeed(Credential.CredentialsService, {
    queryCredentials: async () => (apiKey ? [{ service: TYPESAFE_SOURCE, apiKey }] : []),
    getCredential: async () => {
      throw new Error('not used');
    },
  });

/** Answers every call as System One would, recording the ones that reach the model endpoint. */
const stubFetch = () => {
  const calls: Request[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      if (new URL(request.url).pathname.endsWith('/systemone')) {
        calls.push(request);
      }
      return Response.json({
        model: 'jev-1.13.0',
        answers: { urgent: { type: 'noul', noul: 0.9 } },
        usage: { input_tokens: 10, output_tokens: 1 },
      });
    }),
  );
  return calls;
};

const ask = (apiUrl: string | undefined, apiKey?: string) =>
  DecisionModel.decide(Urgency, { input: { subject: 'Payouts failing for 3 days' } }).pipe(
    Effect.provide(
      providerLayer(apiUrl, () => new EdgeHttpClient('https://edge.test')).pipe(
        Layer.provide(credentialsLayer(apiKey)),
      ),
    ),
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TypeSafe provider layer', () => {
  test('routes through the EDGE typesafe proxy on the platform key when nothing is connected', ({ expect }) =>
    EffectEx.runPromise(
      Effect.gen(function* () {
        const calls = stubFetch();
        const response = yield* ask(undefined);

        expect(response.answers.urgent.probability).toBe(0.9);
        expect(calls.map((request) => request.url)).toEqual(['https://edge.test/ai/generate/typesafe/v1/systemone']);
        expect(calls[0].headers.get('x-byok')).toBeNull();
      }),
    ));

  test('sends a connected key to EDGE as X-BYOK', ({ expect }) =>
    EffectEx.runPromise(
      Effect.gen(function* () {
        const calls = stubFetch();
        yield* ask(undefined, 'ts-user-key');

        expect(calls[0].headers.get('x-byok')).toBe('ts-user-key');
      }),
    ));

  test('an apiUrl bypasses EDGE and sends the connected key as a bearer token', ({ expect }) =>
    EffectEx.runPromise(
      Effect.gen(function* () {
        const calls = stubFetch();
        yield* ask('https://typesafe.example/v1', 'ts-user-key');

        expect(calls.map((request) => request.url)).toEqual(['https://typesafe.example/v1/systemone']);
        expect(calls[0].headers.get('authorization')).toBe('Bearer ts-user-key');
        expect(calls[0].headers.get('x-byok')).toBeNull();
      }),
    ));
});
