//
// Copyright 2025 DXOS.org
//

import { describe, test } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import {} from '@dxos/app-framework';
import { fromPlugins } from '@dxos/app-framework/testing';
import { TestConsole, TestLayer } from '@dxos/cli-util/testing';
import { ClientService } from '@dxos/client';
import { EffectEx } from '@dxos/effect';
import { ObservabilityPlugin } from '@dxos/plugin-observability/plugin';

import { ClientPlugin } from '#plugin';

import { handler } from './create';

// TODO(wittjosiah): Align browser and node variant option types for ObservabilityPlugin.
const layer = Layer.merge(TestLayer, fromPlugins([ClientPlugin({}), ObservabilityPlugin({} as any)]));

// TODO(wittjosiah): Fix these tests.
describe.skip('halo create', () => {
  test('should create an identity without a display name', ({ expect }) =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* handler({ agent: false, displayName: Option.none() });
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      expect(logs).toHaveLength(1);
      const parsedIdentity = TestConsole.parseJson(logs[0]);
      expect(parsedIdentity).toEqual({
        identityDid: client.halo.identity.get()?.did,
        displayName: client.halo.identity.get()?.profile?.displayName,
      });
    }).pipe(Effect.provide(layer), Effect.scoped, EffectEx.runAndForwardErrors));

  test('should create an identity with a display name', ({ expect }) =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* handler({ agent: false, displayName: Option.some('Example') });
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      expect(logs).toHaveLength(1);
      const parsedIdentity = TestConsole.parseJson(logs[0]);
      expect(parsedIdentity).toEqual({
        identityDid: client.halo.identity.get()?.did,
        displayName: client.halo.identity.get()?.profile?.displayName,
      });
    }).pipe(Effect.provide(layer), Effect.scoped, EffectEx.runAndForwardErrors));
});
