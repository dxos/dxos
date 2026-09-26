//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Client, ClientService } from '@dxos/client';

import { SandboxService } from '#types';

import { SANDBOX_BACKEND_ENV, layer } from './layer.ts';

// The EDGE backend only reads the client when a call is made, so an uninitialized one suffices.
const TestLayer = layer.pipe(Layer.provide(Layer.sync(ClientService, () => new Client())));

describe('SandboxService layer', () => {
  afterEach(() => {
    delete process.env[SANDBOX_BACKEND_ENV];
  });

  it.effect('runs sandboxes on EDGE by default', () =>
    Effect.gen(function* () {
      const sandboxService = yield* SandboxService.Service;
      expect(sandboxService.kind).toBe('edge');
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('runs sandboxes locally when asked to', () =>
    Effect.gen(function* () {
      process.env[SANDBOX_BACKEND_ENV] = 'local';
      const sandboxService = yield* SandboxService.Service.pipe(Effect.provide(TestLayer));
      expect(sandboxService.kind).toBe('local');
    }),
  );
});
