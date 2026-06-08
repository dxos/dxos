//
// Copyright 2026 DXOS.org
//

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as HttpClientResponse from '@effect/platform/HttpClientResponse';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import { byokHeaderLayer } from './byok';
import * as Credential from './Credential';

describe('byokHeaderLayer', () => {
  test('attaches X-BYOK header when a credential is found for the provider host', async ({ expect }) => {
    const sink: { lastHeader?: string } = {};

    const program = Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;
      yield* client.execute(HttpClientRequest.get('http://internal/provider/anthropic/messages'));
    });

    const runnable = program.pipe(
      Effect.provide(
        byokHeaderLayer('anthropic.com').pipe(
          Layer.provide(captureHeaderClient(sink)),
          Layer.provide(credentialsLayer([{ service: 'anthropic.com', apiKey: 'sk-ant-user' }])),
        ),
      ),
    );
    await EffectEx.runAndForwardErrors(runnable as Effect.Effect<void>);

    expect(sink.lastHeader).toBe('sk-ant-user');
  });

  test('does not attach X-BYOK when no credential is found', async ({ expect }) => {
    const sink: { lastHeader?: string } = {};

    const program = Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;
      yield* client.execute(HttpClientRequest.get('http://internal/provider/anthropic/messages'));
    });

    const runnable = program.pipe(
      Effect.provide(
        byokHeaderLayer('anthropic.com').pipe(
          Layer.provide(captureHeaderClient(sink)),
          Layer.provide(credentialsLayer([])),
        ),
      ),
    );
    await EffectEx.runAndForwardErrors(runnable as Effect.Effect<void>);

    expect(sink.lastHeader).toBeUndefined();
  });

  test('does not attach X-BYOK when the matching credential has no apiKey', async ({ expect }) => {
    const sink: { lastHeader?: string } = {};

    const program = Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;
      yield* client.execute(HttpClientRequest.get('http://internal/provider/anthropic/messages'));
    });

    const runnable = program.pipe(
      Effect.provide(
        byokHeaderLayer('anthropic.com').pipe(
          Layer.provide(captureHeaderClient(sink)),
          Layer.provide(credentialsLayer([{ service: 'anthropic.com' }])),
        ),
      ),
    );
    await EffectEx.runAndForwardErrors(runnable as Effect.Effect<void>);

    expect(sink.lastHeader).toBeUndefined();
  });

  test('forwards the request unchanged when queryCredentials throws', async ({ expect }) => {
    const sink: { lastHeader?: string; called?: boolean } = {};
    const failingCredentials = Layer.succeed(Credential.CredentialsService, {
      queryCredentials: async () => {
        throw new Error('database unreachable');
      },
      getCredential: async () => {
        throw new Error('database unreachable');
      },
    });

    const program = Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;
      sink.called = true;
      yield* client.execute(HttpClientRequest.get('http://internal/provider/anthropic/messages'));
    });

    const runnable = program.pipe(
      Effect.provide(
        byokHeaderLayer('anthropic.com').pipe(
          Layer.provide(captureHeaderClient(sink)),
          Layer.provide(failingCredentials),
        ),
      ),
    );
    await EffectEx.runAndForwardErrors(runnable as Effect.Effect<void>);

    expect(sink.called).toBe(true);
    expect(sink.lastHeader).toBeUndefined();
  });
});

const captureHeaderClient = (sink: { lastHeader?: string }) =>
  Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request) => {
      sink.lastHeader = request.headers['x-byok'];
      return Effect.succeed(HttpClientResponse.fromWeb(request, new Response('ok')));
    }),
  );

const credentialsLayer = (credentials: Credential.ServiceCredential[]) =>
  Layer.succeed(Credential.CredentialsService, {
    queryCredentials: async ({ service }) => credentials.filter((credential) => credential.service === service),
    getCredential: async ({ service }) => {
      const credential = credentials.find((entry) => entry.service === service);
      if (!credential) {
        throw new Error(`Credential not found for service: ${service}`);
      }
      return credential;
    },
  });
