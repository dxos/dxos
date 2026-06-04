//
// Copyright 2026 DXOS.org
//

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as HttpClientResponse from '@effect/platform/HttpClientResponse';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { Credential } from '@dxos/compute';

import { byokHeaderLayer } from './byok';
import { ConfiguredCredentialsService } from './credentials';

const captureHeaderClient = (sink: { lastHeader?: string }) =>
  Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request) => {
      sink.lastHeader = request.headers['x-byok'];
      return Effect.succeed(HttpClientResponse.fromWeb(request, new Response('ok')));
    }),
  );

describe('byokHeaderLayer', () => {
  test('attaches X-BYOK header when a credential is found for the provider host', async ({ expect }) => {
    const sink: { lastHeader?: string } = {};
    const credentials = new ConfiguredCredentialsService([{ service: 'anthropic.com', apiKey: 'sk-ant-user' }]);

    const program = Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;
      yield* client.execute(HttpClientRequest.get('http://internal/provider/anthropic/messages'));
    });

    const runnable = program.pipe(
      Effect.provideService(Credential.CredentialsService, credentials),
      Effect.provide(byokHeaderLayer('anthropic.com').pipe(Layer.provide(captureHeaderClient(sink)))),
    );
    await Effect.runPromise(runnable as Effect.Effect<void>);

    expect(sink.lastHeader).toBe('sk-ant-user');
  });

  test('does not attach X-BYOK when no credential is found', async ({ expect }) => {
    const sink: { lastHeader?: string } = {};
    const credentials = new ConfiguredCredentialsService([]);

    const program = Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;
      yield* client.execute(HttpClientRequest.get('http://internal/provider/anthropic/messages'));
    });

    const runnable = program.pipe(
      Effect.provideService(Credential.CredentialsService, credentials),
      Effect.provide(byokHeaderLayer('anthropic.com').pipe(Layer.provide(captureHeaderClient(sink)))),
    );
    await Effect.runPromise(runnable as Effect.Effect<void>);

    expect(sink.lastHeader).toBeUndefined();
  });

  test('does not attach X-BYOK when the matching credential has no apiKey', async ({ expect }) => {
    const sink: { lastHeader?: string } = {};
    const credentials = new ConfiguredCredentialsService([{ service: 'anthropic.com' }]);

    const program = Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;
      yield* client.execute(HttpClientRequest.get('http://internal/provider/anthropic/messages'));
    });

    const runnable = program.pipe(
      Effect.provideService(Credential.CredentialsService, credentials),
      Effect.provide(byokHeaderLayer('anthropic.com').pipe(Layer.provide(captureHeaderClient(sink)))),
    );
    await Effect.runPromise(runnable as Effect.Effect<void>);

    expect(sink.lastHeader).toBeUndefined();
  });
});
