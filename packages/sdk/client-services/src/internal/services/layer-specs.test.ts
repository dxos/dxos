//
// Copyright 2026 DXOS.org
//

import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Scope from 'effect/Scope';
import * as Reactivity from 'effect/unstable/reactivity/Reactivity';
import { describe, expect, onTestFinished, test } from 'vitest';

import { makeClientServicesRpcFromRouter } from '@dxos/client-protocol';
import { LayerStack } from '@dxos/compute-runtime';
import { Config, ConfigService } from '@dxos/config';
import { EchoHostService } from '@dxos/echo-host';
import { EffectEx, Hook } from '@dxos/effect';
import {
  MemorySignalManager,
  MemorySignalManagerContext,
  type SignalManager,
  SignalManagerService,
} from '@dxos/messaging';
import { createRtcTransportFactory } from '@dxos/network-manager';
import { SystemService } from '@dxos/protocols/rpc';
import { RpcRouter } from '@dxos/rpc';
import { layerMemory as sqliteLayerMemory } from '@dxos/sql-sqlite/platform';

import * as IdentityContract from '../../contracts/identity.ts';
import * as Events from '../../Events.ts';
import { TransportFactoryService } from '../mesh/index.ts';
import { clientServiceSpecs } from './layer-specs.ts';

describe('clientServiceSpecs', () => {
  test('resolves a component the graph builds from the ambient SQL runtime', async () => {
    const { resolve } = await makeHarness();
    expect(await resolve(IdentityContract.ManagerService)).toBeDefined();
    expect(await resolve(EchoHostService)).toBeDefined();
  });

  test('the rpc registrations run without anything asking for them', async () => {
    const { resolve, scope } = await makeHarness();

    // Resolving any service initializes the slice, which builds every eager spec — including the
    // registrations, which provide no tag for this test to ask for.
    await resolve(RpcRouter.RpcRouter);
    const router = await resolve(RpcRouter.RpcRouter);
    const rpc = await EffectEx.runPromise(
      makeClientServicesRpcFromRouter.pipe(Effect.provideService(RpcRouter.RpcRouter, router), Scope.provide(scope)),
    );

    expect(await EffectEx.runPromise(rpc['SystemService.getConfig'](undefined))).toBeDefined();
  });

  test('the stack opens and closes over the lifecycle events', async () => {
    const { resolve, controller } = await makeHarness();
    await resolve(SystemService.Tag);

    await EffectEx.runPromise(
      Effect.gen(function* () {
        yield* Hook.emit(Events.Opening, undefined);
        yield* Hook.emit(Events.StackOpened, undefined);
      }).pipe(Effect.provideService(Hook.Controller, controller)),
    );

    const system = await resolve(SystemService.Tag);
    expect(system).toBeDefined();
  });
});

/**
 * The stack's ambient services: everything the embedder supplies rather than the graph building —
 * config, the hook controller, the SQL runtime and the platform inputs. No edge clients, so every
 * edge-dependent spec is pruned.
 */
const makeHarness = async () => {
  const controller = Hook.makeController();
  const sql = ManagedRuntime.make(sqliteLayerMemory.pipe(Layer.provideMerge(Reactivity.layer)).pipe(Layer.orDie));
  const signalManager: SignalManager = new MemorySignalManager(new MemorySignalManagerContext());
  const services = EffectContext.empty().pipe(
    EffectContext.add(ConfigService, new Config()),
    EffectContext.add(Hook.Controller, controller),
    EffectContext.add(SignalManagerService, signalManager),
    EffectContext.add(TransportFactoryService, createRtcTransportFactory()),
    EffectContext.merge(await sql.context()),
  );

  const stack = new LayerStack.LayerStack({ layers: clientServiceSpecs({}), services });
  onTestFinished(async () => {
    await EffectEx.runPromise(stack.destroy());
    await sql.dispose();
  });

  const scope = Effect.runSync(Scope.make());
  onTestFinished(() => EffectEx.runPromise(Scope.close(scope, Exit.void)));
  const resolve = <Tag extends EffectContext.Key<any, any>>(tag: Tag) =>
    EffectEx.runPromise(stack.getServiceResolver().resolve(tag, {}).pipe(Scope.provide(scope)));

  return { stack, controller, resolve, scope };
};
