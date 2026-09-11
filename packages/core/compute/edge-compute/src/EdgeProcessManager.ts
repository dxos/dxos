//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import { type Client } from '@dxos/client';
import { RemoteProcessManager, RemoteTraceMonitor } from '@dxos/compute-runtime';
import type * as Process from '@dxos/compute/Process';
import { Context as DxosContext } from '@dxos/context';
import { type EdgeHttpClient } from '@dxos/edge-client';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { createEdgeClient } from './edge-client.ts';
import * as EdgeProcessControl from './EdgeProcessControl.ts';

/**
 * EDGE implementation of {@link RemoteProcessManager.Service} — the client's view of processes
 * running on EDGE, which is where a hosted process belongs in the aggregate `ProcessMonitor` tree.
 *
 * One manager serves every space: `control`'s verbs each take the space they address, so nothing
 * here is space-scoped and a stack needs no instance per space.
 *
 * `processTree` is the atom rather than a live read, because the index is per-space and this manager
 * spans them — every spawn publishes the space it addressed into it (that is what the aggregate
 * `ProcessMonitor` renders as the remote half). `cancel` force-cancels the current run of
 * an edge trigger (its in-flight execution and `runAgain` continuation chain) via
 * {@link EdgeHttpClient.cancelTriggerRun}.
 *
 * A manager built without a client (the {@link layer} stub) has none of them: an empty tree, no
 * control, no cancel.
 */
const makeManager = (
  registry: Registry.AtomRegistry,
  getEdgeClient?: () => EdgeHttpClient,
  control?: RemoteProcessManager.Control,
  remoteTrace?: RemoteTraceMonitor.Monitor,
): RemoteProcessManager.Manager => {
  const processTreeAtom = Atom.make<readonly Process.Info[]>([]);
  registry.mount(processTreeAtom);
  return {
    processTree: Effect.sync(() => registry.get(processTreeAtom)),
    processTreeAtom,
    // The verbs that need a control come as a set, so a manager built without one lacks all of them
    // and a caller that needs to spawn remotely fails where it asks.
    ...(control
      ? { control, ...RemoteProcessManager.makeControlVerbs(control, registry, processTreeAtom, remoteTrace) }
      : {}),
    ...(getEdgeClient
      ? {
          cancel: ({ space, trigger }: RemoteProcessManager.CancelTarget) =>
            Effect.gen(function* () {
              // `space` arrives as an untyped string from trace meta; skip rather than throw when it is
              // not a valid space id (best-effort — the meter has already cleared locally).
              if (!SpaceId.isValid(space)) {
                log.warn('remote trigger cancel skipped: invalid space id', { space });
                return;
              }
              yield* Effect.tryPromise(() =>
                getEdgeClient().cancelTriggerRun(DxosContext.default(), space, trigger),
              ).pipe(
                Effect.asVoid,
                // A missing/unreachable endpoint (e.g. an older edge deploy) must not surface as a defect
                // from this fire-and-forget cancel — log and move on.
                Effect.catch((error) => Effect.sync(() => log.warn('remote trigger cancel failed', { error }))),
              );
            }),
        }
      : {}),
  } satisfies RemoteProcessManager.Manager;
};

const make = (
  getEdgeClient?: () => EdgeHttpClient,
  control?: RemoteProcessManager.Control,
): Layer.Layer<RemoteProcessManager.Service, never, Registry.AtomRegistry> =>
  Layer.effect(
    RemoteProcessManager.Service,
    Effect.gen(function* () {
      const registry = yield* Registry.AtomRegistry;
      // Optional so every construction site keeps its shape: a deployment with no swarm monitor
      // (local-only, or a test) simply falls back to polling the host's event ring.
      const remoteTrace = yield* Effect.serviceOption(RemoteTraceMonitor.Service);
      return makeManager(registry, getEdgeClient, control, Option.getOrUndefined(remoteTrace));
    }),
  );

/**
 * Trigger cancel only, from a pre-built edge client: no process control, empty process tree.
 * For the full surface use {@link fromClient} or {@link fromEdgeProcessClient}.
 */
export const fromEdgeClient = (
  edgeClient: EdgeHttpClient,
): Layer.Layer<RemoteProcessManager.Service, never, Registry.AtomRegistry> => make(() => edgeClient);

/**
 * For tests: the full surface over a pre-built process client — a live process tree for `spaceId`,
 * process control, and trigger cancel.
 */
export const fromEdgeProcessClient = (
  edgeClient: EdgeHttpClient,
): Layer.Layer<RemoteProcessManager.Service, never, Registry.AtomRegistry> =>
  make(
    () => edgeClient,
    EdgeProcessControl.make(() => edgeClient),
  );

/**
 * The full surface from a `Client`: process control, a process tree, and trigger cancel, with both
 * the edge client and the control deferred until first use (identity / edge config may be absent at
 * boot). This is what an application stack provides.
 *
 * Control is included rather than cancel-only: an agent asking for `location: 'edge'` spawns through
 * this manager, and a manager built without a control lacks `spawn`/`list` altogether, so the request
 * failed with "RemoteProcessManager offers no process control" wherever edge was configured. Per-space
 * addressing is not an obstacle — `Control` takes the space on each call, not at construction.
 */
export const fromClient = (client: Client): Layer.Layer<RemoteProcessManager.Service, never, Registry.AtomRegistry> => {
  let cached: EdgeHttpClient | undefined;
  return make(() => (cached ??= createEdgeClient(client)), EdgeProcessControl.fromClient(client));
};

/**
 * EDGE process manager with no client — empty process tree, no control, no cancel.
 * Used where edge is not configured.
 */
export const layer: Layer.Layer<RemoteProcessManager.Service, never, Registry.AtomRegistry> = make();
