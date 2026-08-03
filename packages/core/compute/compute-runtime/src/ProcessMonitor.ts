//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Atom, Registry } from '@effect-atom/atom';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';

import { Process, type Trace } from '@dxos/compute';

import { ProcessManagerService } from './process-manager-service';
import * as RemoteProcessManager from './RemoteProcessManager';
import * as RemoteTraceMonitor from './RemoteTraceMonitor';

/**
 * Aggregate {@link Process.ProcessMonitorService} that merges the local
 * {@link ProcessManagerService} process tree with the remote
 * ({@link RemoteProcessManager.Service}) one, and merges local + remote
 * ({@link RemoteTraceMonitor.Service}) ephemeral trace streams (DX-1125). Provide
 * {@link RemoteProcessManager.layerNoop} / {@link RemoteTraceMonitor.layerNoop} for local-only
 * deployments.
 */
export const layer: Layer.Layer<
  Process.ProcessMonitorService,
  never,
  ProcessManagerService | RemoteProcessManager.Service | RemoteTraceMonitor.Service | Registry.AtomRegistry
> = Layer.effect(
  Process.ProcessMonitorService,
  Effect.gen(function* () {
    const manager = yield* ProcessManagerService;
    const remote = yield* RemoteProcessManager.Service;
    const remoteTrace = yield* RemoteTraceMonitor.Service;
    const registry = yield* Registry.AtomRegistry;

    const aggregate = Atom.make((get) => [...get(manager.monitor.processTreeAtom), ...get(remote.processTreeAtom)]);
    registry.mount(aggregate);

    return {
      processTree: Effect.sync(() => registry.get(aggregate)),
      processTreeAtom: aggregate,
      subscribeToTraceMessages: (filter: Trace.Filter): Stream.Stream<Trace.Message> =>
        Stream.merge(manager.monitor.subscribeToTraceMessages(filter), remoteTrace.subscribeToTraceMessages(filter)),
    } satisfies Process.Monitor;
  }),
);
