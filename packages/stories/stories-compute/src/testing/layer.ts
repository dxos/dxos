//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as KeyValueStore from 'effect/persistence/KeyValueStore';
import * as Atom from 'effect/reactivity/Atom';
import * as Registry from 'effect/reactivity/AtomRegistry';

import { type Client } from '@dxos/client';
import { LocatedProcessManager, ProcessManager, RemoteProcessManager, RemoteTraceMonitor } from '@dxos/compute-runtime';
import { LocalRemoteHost } from '@dxos/compute-runtime/testing';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Process from '@dxos/compute/Process';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Trace from '@dxos/compute/Trace';
import { EdgeProcessManager } from '@dxos/edge-compute';

import { MandelbrotProcess } from './mandelbrot.ts';

/**
 * What stands in for EDGE: a second in-memory runtime behind the remote control surface, or the real
 * EDGE service the client is configured for.
 */
export type RemoteMode = 'simulated' | 'edge';

/**
 * An EDGE stand-in: a second local runtime adapted to {@link RemoteProcessManager.Control}, so remote
 * processes travel the same wire path (snapshots, polled events) as they do against EDGE.
 */
const simulatedRemoteLayer = Layer.effect(
  RemoteProcessManager.Service,
  Effect.gen(function* () {
    const registry = yield* Registry.AtomRegistry;
    const host = new ProcessManager.Impl({
      registry,
      kvStore: KeyValueStore.prefix(yield* KeyValueStore.KeyValueStore, 'edge/'),
      traceSink: yield* Trace.TraceSink,
      serviceResolver: yield* ServiceResolver.ServiceResolver,
      handlerSet: yield* OperationHandlerSet.OperationHandlerProvider,
      idGenerator: ProcessManager.UUIDProcessIdGenerator,
    });
    const control = yield* LocalRemoteHost.makeHost({ manager: host, definitions: [MandelbrotProcess] });
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

export type ComputeLayerOptions = {
  /** Shared with React so handle status atoms render from the registry that updates them. */
  registry: Registry.AtomRegistry;
  /** Absent for a local-only runtime, whose `edge` requests die. */
  remote?: RemoteMode;
  client: Client;
};

/**
 * {@link Process.ManagerService} over a local runtime and the chosen remote.
 */
export const makeComputeLayer = ({
  registry,
  remote,
  client,
}: ComputeLayerOptions): Layer.Layer<Process.ManagerService> =>
  LocatedProcessManager.layer.pipe(
    Layer.provide(ProcessManager.layer()),
    Layer.provide(
      remote === 'edge'
        ? EdgeProcessManager.fromClient(client).pipe(Layer.provide(RemoteTraceMonitor.layerNoop))
        : remote === 'simulated'
          ? simulatedRemoteLayer
          : RemoteProcessManager.layerNoop,
    ),
    Layer.provide(ServiceResolver.layerRequirements()),
    Layer.provide(OperationHandlerSet.provide(OperationHandlerSet.empty)),
    Layer.provide(KeyValueStore.layerMemory),
    Layer.provide(Trace.layerNoop),
    Layer.provide(Layer.succeed(Registry.AtomRegistry, registry)),
  );
