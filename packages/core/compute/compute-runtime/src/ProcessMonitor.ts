//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Atom, Registry } from '@effect-atom/atom';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Process } from '@dxos/compute';

import { ProcessManagerService } from './process-manager-service';
import * as RemoteProcessManager from './RemoteProcessManager';

/**
 * Aggregate {@link Process.ProcessMonitorService} that merges the local
 * {@link ProcessManagerService} process tree with the remote
 * ({@link RemoteProcessManager.Service}) one. Provide
 * {@link RemoteProcessManager.layerNoop} for local-only deployments.
 */
export const layer: Layer.Layer<
  Process.ProcessMonitorService,
  never,
  ProcessManagerService | RemoteProcessManager.Service | Registry.AtomRegistry
> = Layer.effect(
  Process.ProcessMonitorService,
  Effect.gen(function* () {
    const manager = yield* ProcessManagerService;
    const remote = yield* RemoteProcessManager.Service;
    const registry = yield* Registry.AtomRegistry;

    const aggregate = Atom.make((get) => [...get(manager.monitor.processTreeAtom), ...get(remote.processTreeAtom)]);
    registry.mount(aggregate);

    return {
      processTree: Effect.sync(() => registry.get(aggregate)),
      processTreeAtom: aggregate,
    } satisfies Process.Monitor;
  }),
);
