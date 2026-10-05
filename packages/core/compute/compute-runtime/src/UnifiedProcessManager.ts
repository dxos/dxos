//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Atom from 'effect/reactivity/Atom';
import * as Registry from 'effect/reactivity/AtomRegistry';
import type * as Rpc from 'effect/rpc/Rpc';
import * as Stream from 'effect/Stream';

import type * as Operation from '@dxos/compute/Operation';
import * as Process from '@dxos/compute/Process';
import type * as Trace from '@dxos/compute/Trace';

import { ProcessManagerService } from './process-manager-service.ts';
import * as RemoteProcessManager from './RemoteProcessManager.ts';
import * as RemoteTraceMonitor from './RemoteTraceMonitor.ts';

/**
 * {@link Process.ManagerService} over the local {@link ProcessManagerService} and the remote
 * ({@link RemoteProcessManager.Service}) one: the reads merge both trees and trace streams, and each
 * control verb goes to the manager its {@link Process.Location} names. Provide
 * {@link RemoteProcessManager.layerNoop} / {@link RemoteTraceMonitor.layerNoop} for local-only
 * deployments.
 */
export const layer: Layer.Layer<
  Process.ManagerService,
  never,
  ProcessManagerService | RemoteProcessManager.Service | RemoteTraceMonitor.Service | Registry.AtomRegistry
> = Layer.effect(
  Process.ManagerService,
  Effect.gen(function* () {
    const local = yield* ProcessManagerService;
    const remote = yield* RemoteProcessManager.Service;
    const remoteTrace = yield* RemoteTraceMonitor.Service;
    const registry = yield* Registry.AtomRegistry;

    const aggregate = Atom.make((get) => [...get(local.processTreeAtom), ...get(remote.processTreeAtom)]);
    registry.mount(aggregate);

    const processTree = Effect.sync(() => registry.get(aggregate));
    const refreshRemote = remote.refreshProcessTree;

    // Dies rather than failing: a remote manager built without control is a deployment fault, and
    // every other verb on this surface reports host failures as defects too.
    const remoteControl = <K extends 'spawn' | 'list'>(verb: K): NonNullable<RemoteProcessManager.Manager[K]> => {
      const control = remote[verb];
      if (control === undefined) {
        throw new Error('Remote process requested, but RemoteProcessManager offers no process control.');
      }
      return control;
    };

    return {
      processTree,
      processTreeAtom: aggregate,
      // A filter naming a space re-reads that space from the remote runtime first: the remote half of
      // the tree is an atom the client writes as it acts, so an action taken any other way (another
      // client, a direct call to the host) would otherwise read back stale. `processTree` and the atom
      // stay the cheap reactive read; this is the authoritative one.
      list: (filter?: Process.Filter) =>
        filter?.space !== undefined && refreshRemote
          ? refreshRemote(filter.space).pipe(Effect.ignore, Effect.andThen(Process.listFromTree(processTree)(filter)))
          : Process.listFromTree(processTree)(filter),
      subscribeToTraceMessages: (filter: Trace.Filter): Stream.Stream<Trace.Message> =>
        Stream.merge(local.subscribeToTraceMessages(filter), remoteTrace.subscribeToTraceMessages(filter)),
      spawn: <I, O, Rpcs extends Rpc.Any = never>(
        definition: Operation.Durable<I, O, any, Rpcs>,
        { location, ...options }: Process.SpawnOptions & Process.LocationOptions = {},
      ): Effect.Effect<Process.Handle<I, O, Rpcs>> =>
        location?.kind === 'edge'
          ? Effect.suspend(() =>
              remoteControl('spawn')({ ...options, spaceId: location.space, key: definition.key, definition }),
            )
          : local.spawn(definition, options),
      handles: ({ location, ...options }: Process.ListOptions & Process.LocationOptions = {}) =>
        location?.kind === 'edge'
          ? Effect.suspend(() => remoteControl('list')({ ...options, spaceId: location.space }))
          : local.list(options),
    } satisfies Process.Manager;
  }),
);
