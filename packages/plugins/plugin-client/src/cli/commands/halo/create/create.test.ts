//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { OperationPlugin } from '@dxos/app-framework';
import { fromPlugins } from '@dxos/app-framework/testing';
import { TestConsole, TestLayer } from '@dxos/cli-util/testing';
import { ClientService } from '@dxos/client';
import { runAndForwardErrors } from '@dxos/effect';
import { ObservabilityPlugin } from '@dxos/plugin-observability/cli';

import { ClientPlugin } from '../../../plugin';

import { handler } from './create';

const layer = Layer.merge(TestLayer, fromPlugins([ClientPlugin({}), OperationPlugin(), ObservabilityPlugin()]));

// TODO(wittjosiah): Fix these tests.
describe.skip('halo create', () => {
  it('should create an identity without a display name', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* handler({ agent: false, displayName: Option.none() });
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      expect(logs).toHaveLength(1);
      const parsedIdentity = TestConsole.parseJson(logs[0]);
      expect(parsedIdentity).toEqual({
        identityKey: client.halo.identity.get()?.identityKey.toHex(),
        displayName: client.halo.identity.get()?.profile?.displayName,
      });
    }).pipe(Effect.provide(layer), Effect.scoped, runAndForwardErrors));

  it('should create an identity with a display name', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* handler({ agent: false, displayName: Option.some('Example') });
      const logger = yield* TestConsole.TestConsole;
      const logs = logger.logs;
      expect(logs).toHaveLength(1);
      const parsedIdentity = TestConsole.parseJson(logs[0]);
      expect(parsedIdentity).toEqual({
        identityKey: client.halo.identity.get()?.identityKey.toHex(),
        displayName: client.halo.identity.get()?.profile?.displayName,
      });
    }).pipe(Effect.provide(layer), Effect.scoped, runAndForwardErrors));
});
