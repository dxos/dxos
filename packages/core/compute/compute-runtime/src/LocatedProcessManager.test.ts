//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as KeyValueStore from 'effect/persistence/KeyValueStore';
import * as Atom from 'effect/reactivity/Atom';
import * as Registry from 'effect/reactivity/AtomRegistry';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Process from '@dxos/compute/Process';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Trace from '@dxos/compute/Trace';
import { SpaceId } from '@dxos/keys';

import * as LocatedProcessManager from './LocatedProcessManager.ts';
import * as ProcessManager from './ProcessManager.ts';
import * as RemoteProcessManager from './RemoteProcessManager.ts';
import * as LocalRemoteHost from './testing/LocalRemoteHost.ts';

const SPACE = SpaceId.random();

/** Waits for input forever, so a spawned process stays live until terminated. */
const IdleProcess = Operation.makeDurable(
  { key: 'test.located.idle', input: Schema.Void, output: Schema.Void, services: [] },
  () => Effect.succeed({}),
);

/** A second local runtime behind the remote control surface, so `edge` is observable without EDGE. */
const simulatedRemote = Layer.effect(
  RemoteProcessManager.Service,
  Effect.gen(function* () {
    const registry = yield* Registry.AtomRegistry;
    const host = new ProcessManager.Impl({
      registry,
      kvStore: KeyValueStore.prefix(yield* KeyValueStore.KeyValueStore, 'host/'),
      traceSink: yield* Trace.TraceSink,
      serviceResolver: yield* ServiceResolver.ServiceResolver,
      handlerSet: yield* OperationHandlerSet.OperationHandlerProvider,
      idGenerator: ProcessManager.UUIDProcessIdGenerator,
    });
    const control = yield* LocalRemoteHost.makeHost({ manager: host, definitions: [IdleProcess] });
    const processTreeAtom = Atom.make<readonly Process.Process[]>([]);
    registry.mount(processTreeAtom);
    return {
      processTree: Effect.sync(() => registry.get(processTreeAtom)),
      processTreeAtom,
      control,
      ...RemoteProcessManager.makeControlVerbs(control, registry, processTreeAtom),
    } satisfies RemoteProcessManager.Manager;
  }),
);

type RemoteRequirements =
  | Registry.AtomRegistry
  | KeyValueStore.KeyValueStore
  | Trace.TraceSink
  | ServiceResolver.ServiceResolver
  | OperationHandlerSet.OperationHandlerProvider;

const makeLayer = (remote: Layer.Layer<RemoteProcessManager.Service, never, RemoteRequirements>) =>
  LocatedProcessManager.layer.pipe(
    Layer.provideMerge(ProcessManager.layer({ idGenerator: ProcessManager.SequentialIdGenerator })),
    Layer.provide(remote),
    Layer.provide(ServiceResolver.layerRequirements()),
    Layer.provide(OperationHandlerSet.provide(OperationHandlerSet.empty)),
    Layer.provide(KeyValueStore.layerMemory),
    Layer.provide(Trace.layerNoop),
    Layer.provideMerge(Registry.layer),
  );

describe('LocatedProcessManager', () => {
  test('routes each location to its own runtime', async ({ expect }) => {
    const result = await Effect.gen(function* () {
      const manager = yield* Process.ManagerService;
      const local = yield* ProcessManager.Service;
      const localHandle = yield* manager.spawn(IdleProcess, { name: 'local' });
      const edgeHandle = yield* manager.spawn(IdleProcess, {
        name: 'edge',
        location: 'edge',
        environment: { space: SPACE },
      });
      return {
        localPids: (yield* local.list()).map((handle) => handle.pid),
        edgePids: (yield* manager.list({ location: 'edge', space: SPACE })).map((handle) => handle.pid),
        localHandle: localHandle.pid,
        edgeHandle: edgeHandle.pid,
        attached: (yield* manager.attach(edgeHandle.pid, { location: 'edge', space: SPACE })).pid,
      };
    }).pipe(Effect.provide(makeLayer(simulatedRemote)), Effect.scoped, Effect.runPromise);

    expect(result.localPids).toEqual([result.localHandle]);
    expect(result.edgePids).toEqual([result.edgeHandle]);
    expect(result.attached).toBe(result.edgeHandle);
  });

  test('dies on edge without a space', async ({ expect }) => {
    const exit = await Effect.gen(function* () {
      const manager = yield* Process.ManagerService;
      return yield* manager.spawn(IdleProcess, { location: 'edge' });
    }).pipe(Effect.provide(makeLayer(simulatedRemote)), Effect.scoped, Effect.runPromiseExit);

    expect(Exit.hasDies(exit)).toBe(true);
  });

  test('dies on edge when the remote manager offers no process control', async ({ expect }) => {
    const exit = await Effect.gen(function* () {
      const manager = yield* Process.ManagerService;
      return yield* manager.spawn(IdleProcess, { location: 'edge', environment: { space: SPACE } });
    }).pipe(Effect.provide(makeLayer(RemoteProcessManager.layerNoop)), Effect.scoped, Effect.runPromiseExit);

    expect(Exit.hasDies(exit)).toBe(true);
  });
});
