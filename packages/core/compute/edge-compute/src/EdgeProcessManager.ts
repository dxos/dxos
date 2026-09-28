//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as Scope from 'effect/Scope';
import type * as KeyValueStore from 'effect/unstable/persistence/KeyValueStore';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import { type Client } from '@dxos/client';
import { QueuedRemoteControl, RemoteProcessManager, RemoteTraceMonitor } from '@dxos/compute-runtime';
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

/**
 * How a manager reaches EDGE when the caller wants commands queued rather than issued directly.
 *
 * Supplying `kvStore` is what turns a spawn into a durable command: state moves locally at once and
 * the push is retried until it lands (see `QueuedRemoteControl`). Without it the control is used
 * bare, and a call made while EDGE is unreachable is simply lost — which is the behaviour every
 * caller had before the queue existed.
 */
export interface QueueOptions {
  /** Command log storage. The same store the local process registry uses is the right one. */
  readonly kvStore: KeyValueStore.KeyValueStore;
  /**
   * Fires when the link to EDGE comes back up, so the flusher retries at once instead of waiting out
   * its backoff. Returns an unsubscribe. Optional: without it, recovery is the backoff alone.
   */
  readonly onConnected?: (listener: () => void) => () => void;
}

const make = (
  getEdgeClient?: () => EdgeHttpClient,
  control?: RemoteProcessManager.Control,
  queue?: QueueOptions,
): Layer.Layer<RemoteProcessManager.Service, never, Registry.AtomRegistry | RemoteTraceMonitor.Service> =>
  Layer.effect(
    RemoteProcessManager.Service,
    Effect.gen(function* () {
      const registry = yield* Registry.AtomRegistry;
      // Declared requirement (not `serviceOption`): hosts with no swarm monitor provide
      // `RemoteTraceMonitor.layerNoop` rather than leaving the tag undeclared.
      const remoteTrace = yield* RemoteTraceMonitor.Service;
      const effective = control !== undefined && queue !== undefined ? yield* queued(control, queue) : control;
      return makeManager(registry, getEdgeClient, effective, remoteTrace);
    }),
  );

/** Wraps `control` in the durable command queue and arms its connection signal for this layer's life. */
const queued = (
  control: RemoteProcessManager.Control,
  options: QueueOptions,
): Effect.Effect<RemoteProcessManager.Control, never, Scope.Scope> =>
  Effect.gen(function* () {
    const client = yield* QueuedRemoteControl.make({ control, kvStore: options.kvStore });
    if (options.onConnected) {
      const unsubscribe = options.onConnected(() => {
        // Fire-and-forget: the signal only cuts a backoff short, so a failed wake costs a retry
        // delay and nothing else.
        Effect.runFork(client.connected);
      });
      yield* Effect.addFinalizer(() => Effect.sync(() => unsubscribe()));
    }
    return client;
  });

/**
 * Trigger cancel only, from a pre-built edge client: no process control, empty process tree.
 * For the full surface use {@link fromClient} or {@link fromEdgeProcessClient}.
 */
export const fromEdgeClient = (
  edgeClient: EdgeHttpClient,
): Layer.Layer<RemoteProcessManager.Service, never, Registry.AtomRegistry | RemoteTraceMonitor.Service> =>
  make(() => edgeClient);

/**
 * For tests: the full surface over a pre-built process client — a live process tree for `spaceId`,
 * process control, and trigger cancel.
 */
export const fromEdgeProcessClient = (
  edgeClient: EdgeHttpClient,
  queue?: QueueOptions,
): Layer.Layer<RemoteProcessManager.Service, never, Registry.AtomRegistry | RemoteTraceMonitor.Service> =>
  make(
    () => edgeClient,
    EdgeProcessControl.make(() => edgeClient),
    queue,
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
export const fromClient = (
  client: Client,
  queue?: QueueOptions,
): Layer.Layer<RemoteProcessManager.Service, never, Registry.AtomRegistry | RemoteTraceMonitor.Service> => {
  let cached: EdgeHttpClient | undefined;
  return make(() => (cached ??= createEdgeClient(client)), EdgeProcessControl.fromClient(client), queue);
};

/**
 * EDGE process manager with no client — empty process tree, no control, no cancel.
 * Used where edge is not configured.
 */
export const layer: Layer.Layer<
  RemoteProcessManager.Service,
  never,
  Registry.AtomRegistry | RemoteTraceMonitor.Service
> = make();
