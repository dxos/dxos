//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Atom, Registry } from '@effect-atom/atom';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { type Client } from '@dxos/client';
import { type Process } from '@dxos/compute';
import { RemoteProcessManager } from '@dxos/compute-runtime';
import { Context as DxosContext } from '@dxos/context';
import { type EdgeHttpClient } from '@dxos/edge-client';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { createEdgeClient } from './edge-client';

/**
 * EDGE implementation of {@link RemoteProcessManager.Service}.
 *
 * The read view (`processTree`) is still empty — the EDGE worker exposes no
 * process-tree endpoint yet (see Decision D3). What this adds is the `cancel`
 * control: it force-cancels the current run of an edge trigger (its in-flight
 * execution and `runAgain` continuation chain) via
 * {@link EdgeHttpClient.cancelTriggerRun}, addressed by `trigger` in `space`.
 * A manager built without a client (the {@link layer} stub) omits `cancel`.
 */
const makeManager = (
  registry: Registry.Registry,
  getEdgeClient?: () => EdgeHttpClient,
): RemoteProcessManager.Manager => {
  // TODO(edge): Populate from an EDGE process-tree endpoint once available.
  const processTreeAtom = Atom.make<readonly Process.Info[]>([]);
  registry.mount(processTreeAtom);
  return {
    processTree: Effect.sync(() => registry.get(processTreeAtom)),
    processTreeAtom,
    ...(getEdgeClient
      ? {
          cancel: ({ space, trigger }: RemoteProcessManager.RemoteCancelTarget) =>
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
                Effect.catchAll((error) => Effect.sync(() => log.warn('remote trigger cancel failed', { error }))),
              );
            }),
        }
      : {}),
  } satisfies RemoteProcessManager.Manager;
};

const make = (
  getEdgeClient?: () => EdgeHttpClient,
): Layer.Layer<RemoteProcessManager.Service, never, Registry.AtomRegistry> =>
  Layer.effect(
    RemoteProcessManager.Service,
    Effect.gen(function* () {
      const registry = yield* Registry.AtomRegistry;
      return makeManager(registry, getEdgeClient);
    }),
  );

/**
 * For tests: provide a pre-built edge client.
 */
export const fromEdgeClient = (
  edgeClient: EdgeHttpClient,
): Layer.Layer<RemoteProcessManager.Service, never, Registry.AtomRegistry> => make(() => edgeClient);

/**
 * Build from a `Client`, deferring edge-client creation until the first cancel
 * (identity / edge config may be absent at boot).
 */
export const fromClient = (client: Client): Layer.Layer<RemoteProcessManager.Service, never, Registry.AtomRegistry> => {
  let cached: EdgeHttpClient | undefined;
  return make(() => (cached ??= createEdgeClient(client)));
};

/**
 * EDGE process manager with no client — empty process tree and no cancel control.
 * Used where edge is not configured.
 */
export const layer: Layer.Layer<RemoteProcessManager.Service, never, Registry.AtomRegistry> = make();
