//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Redacted from 'effect/Redacted';
import * as AiError from 'effect/unstable/ai/AiError';
import { describe, test } from 'vitest';

import * as Credential from '@dxos/compute/Credential';
import { EffectEx } from '@dxos/effect';

import { TypeSafeSettings } from '#types';

import { TYPESAFE_SOURCE } from '../constants.ts';
import { EDGE_ENDPOINT, WORKERS_AI_ENDPOINT } from './edge-http-client.ts';
import { connectedApiKey, requiredApiKey, resolveEndpoint } from './model-resolver.ts';

const credentials = (query: () => Promise<Credential.ServiceCredential[]>) =>
  Layer.succeed(Credential.CredentialsService, {
    queryCredentials: query,
    getCredential: async () => {
      throw new Error('not used');
    },
  });

const reasonOf = (
  effect: Effect.Effect<unknown, AiError.AiError, Credential.CredentialsService>,
  layer: Layer.Layer<Credential.CredentialsService>,
) =>
  EffectEx.runPromise(
    effect.pipe(
      Effect.flip,
      Effect.map((error) => error.reason._tag),
      Effect.provide(layer),
    ),
  );

describe('TypeSafe key resolution', () => {
  test('no connected key reads as none, so EDGE answers on the platform key', ({ expect }) =>
    EffectEx.runPromise(
      connectedApiKey.pipe(
        Effect.map((apiKey) => expect(apiKey).toBeUndefined()),
        Effect.provide(credentials(async () => [])),
      ),
    ));

  test('a failed lookup fails the decision rather than billing the platform key', async ({ expect }) => {
    const failing = credentials(async () => {
      throw new Error('credential store unavailable');
    });
    expect(await reasonOf(connectedApiKey, failing)).toBe('UnknownError');
  });

  test('a direct endpoint sends the connected key, and fails without one', async ({ expect }) => {
    const apiKey = await EffectEx.runPromise(
      requiredApiKey('https://typesafe.example/v1/systemone').pipe(
        Effect.provide(credentials(async () => [{ service: TYPESAFE_SOURCE, apiKey: 'ts-user-key' }])),
      ),
    );
    expect(Redacted.value(apiKey)).toBe('ts-user-key');
    expect(
      await reasonOf(
        requiredApiKey('https://typesafe.example/v1/systemone'),
        credentials(async () => []),
      ),
    ).toBe('AuthenticationError');
  });

  test('a cleartext endpoint is refused before the key is read', async ({ expect }) => {
    let queried = false;
    const layer = credentials(async () => {
      queried = true;
      return [{ service: TYPESAFE_SOURCE, apiKey: 'ts-user-key' }];
    });
    expect(await reasonOf(requiredApiKey('http://typesafe.example/v1/systemone'), layer)).toBe('InvalidRequestError');
    expect(queried).toBe(false);
  });
});

describe('endpoint override validation', () => {
  test('requires https, allowing http only on loopback', ({ expect }) => {
    expect(TypeSafeSettings.isAllowedEndpoint('https://typesafe.example/v1/systemone')).toBe(true);
    expect(TypeSafeSettings.isAllowedEndpoint('http://localhost:8787/v1/systemone')).toBe(true);
    expect(TypeSafeSettings.isAllowedEndpoint('http://[::1]:8787/v1/systemone')).toBe(true);
    expect(TypeSafeSettings.isAllowedEndpoint('http://typesafe.example/v1/systemone')).toBe(false);
    expect(TypeSafeSettings.isAllowedEndpoint('not a url')).toBe(false);
  });
});

describe('resolveEndpoint', () => {
  test('routes through EDGE to TypeSafe by default, and to Workers AI when selected', ({ expect }) => {
    expect(resolveEndpoint(undefined)).toBe(EDGE_ENDPOINT);
    expect(resolveEndpoint({ backend: 'typesafe' })).toBe(EDGE_ENDPOINT);
    expect(resolveEndpoint({ backend: 'workers-ai' })).toBe(WORKERS_AI_ENDPOINT);
  });

  test('honours the endpoint override for TypeSafe only', ({ expect }) => {
    const endpoint = 'https://typesafe.example/v1/systemone';
    expect(resolveEndpoint({ endpoint })).toBe(endpoint);
    expect(resolveEndpoint({ backend: 'workers-ai', endpoint })).toBe(WORKERS_AI_ENDPOINT);
  });
});
