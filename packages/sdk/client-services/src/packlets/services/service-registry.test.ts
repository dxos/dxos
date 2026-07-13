//
// Copyright 2022 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, expect, test } from 'vitest';

import { Event } from '@dxos/async';
import { Config } from '@dxos/config';
import { Context } from '@dxos/context';
import { EffectEx } from '@dxos/effect';
import { makeInProcessClient } from '@dxos/protocols';
import { SystemStatus } from '@dxos/protocols/proto/dxos/client/services';
import { SystemService } from '@dxos/protocols/rpc';

import { SystemServiceImpl } from '../system';
import { createServiceContext } from '../testing';
import { ServiceRegistry } from './service-registry';

// TODO(burdon): Create TestService (that doesn't require peers).

describe('service registry', () => {
  test('builds a service registry', async () => {
    const remoteSource = 'https://remote.source';
    const serviceContext = await createServiceContext();
    await serviceContext.open(new Context());

    const serviceRegistry = new ServiceRegistry({
      SystemService: new SystemServiceImpl({
        config: () => new Config({ runtime: { client: { remoteSource } } }),
        getCurrentStatus: () => SystemStatus.ACTIVE,
        getDiagnostics: async () => ({}),
        onReset: () => {},
        onUpdateStatus: () => {},
        statusUpdate: new Event(),
      }),
    });

    // The registry now holds effect-rpc handlers; bridge the registered handler to an in-process
    // client so the call exercises the same effect surface consumers use.
    await Effect.gen(function* () {
      const client = yield* makeInProcessClient(SystemService.Rpcs, serviceRegistry.services.SystemService!);
      const config = yield* client.SystemService.getConfig(undefined);
      expect(config.runtime?.client?.remoteSource).to.equal(remoteSource);
    }).pipe(Effect.scoped, EffectEx.runPromise);
  });
});
