//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import * as Process from '@dxos/compute/Process';
import type * as Trace from '@dxos/compute/Trace';

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

    const processTree = Effect.sync(() => registry.get(aggregate));
    const refreshRemote = remote.refreshProcessTree;
    return {
      processTree,
      processTreeAtom: aggregate,
      // A filter naming a space re-reads that space from the remote runtime first: the remote half of
      // the tree is an atom the client writes as it acts, so an action taken any other way (another
      // client, a direct call to the host) would otherwise read back stale. `processTree` and the atom
      // stay the cheap reactive read; this is the authoritative one.
      list: (filter?: Process.MonitorFilter) =>
        filter?.space !== undefined && refreshRemote
          ? refreshRemote(filter.space).pipe(Effect.ignore, Effect.andThen(Process.listFromTree(processTree)(filter)))
          : Process.listFromTree(processTree)(filter),
      subscribeToTraceMessages: (filter: Trace.Filter): Stream.Stream<Trace.Message> =>
        Stream.merge(manager.monitor.subscribeToTraceMessages(filter), remoteTrace.subscribeToTraceMessages(filter)),
    } satisfies Process.Monitor;
  }),
);
