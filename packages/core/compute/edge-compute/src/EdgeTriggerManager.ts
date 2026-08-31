//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Schedule from 'effect/Schedule';
import type * as Scope from 'effect/Scope';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import { type Client, ClientService } from '@dxos/client';
import { RemoteTriggerManager } from '@dxos/compute-runtime';
import type * as Trigger from '@dxos/compute/Trigger';
import { Context as DxosContext } from '@dxos/context';
import { Ref } from '@dxos/echo';
import { type EdgeTriggerStatus } from '@dxos/edge-client';
import { EID, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { createEdgeClient } from './edge-client';

type EdgeClient = ReturnType<typeof createEdgeClient>;

/** How often the remote trigger view is refreshed from the EDGE dispatcher. */
const POLL_INTERVAL = Duration.seconds(15);

/**
 * Backoff for a force-run that reaches EDGE before the client's state has caught up there
 * (~31s total across 5 retries): a trigger created client-side is force-run immediately by the UI,
 * so the first attempt can lose the race — against replication of the trigger itself (rejected as
 * not found) or against the identity being associated with an account. Every failure is retried
 * rather than a specific code, since EDGE spells these races several ways.
 *
 * TODO(dmaretskyi): Remove once the client can await replication of the trigger to EDGE.
 */
const REPLICATION_BACKOFF = Schedule.exponential(Duration.seconds(1), 2).pipe(Schedule.upTo({ times: 5 }));

/**
 * EDGE implementation of {@link RemoteTriggerManager.Service}.
 *
 * The `triggers` atom is populated by polling
 * {@link EdgeHttpClient.getSpaceTriggers} and mapping each edge trigger's
 * runtime status into a {@link Trigger.State} (marked `environment: 'edge'`).
 * The referenced `Trigger` objects are replicated into the local database, so
 * the trigger ref is a space-relative echo ref synthesized from the id. The
 * aggregate {@link TriggerMonitor} dedupes these against the database-derived
 * view (edge entries here supersede the bare database ones).
 *
 * `invokeTrigger` force-runs the trigger's cron on the EDGE dispatcher via
 * {@link EdgeHttpClient.forceRunCronTrigger}.
 */
const toState = (status: EdgeTriggerStatus): Trigger.State => ({
  // Space-relative echo ref (same shape as `Ref.make(trigger)` for an in-space object), resolvable
  // against the space database where the edge trigger is replicated.
  trigger: Ref.fromURI(EID.make({ entityId: status.triggerId })),
  environment: 'edge',
  nextExecution: status.nextExecutionTimestamp !== undefined ? new Date(status.nextExecutionTimestamp) : undefined,
  cooldownUntil: status.cooldownUntilTimestamp !== undefined ? new Date(status.cooldownUntilTimestamp) : undefined,
  lastResult: toExit(status.lastResult),
});

const toExit = (result: EdgeTriggerStatus['lastResult']): Exit.Exit<unknown> | null => {
  if (!result) {
    return null;
  }
  // The original error channel is not reconstructed over the wire, so failures are surfaced as
  // defects carrying the serialized message.
  return result.status === 'success'
    ? Exit.void
    : Exit.die(new Error(result.error?.message ?? 'Edge trigger invocation failed'));
};

const make = (
  getEdgeClient: () => EdgeClient,
  spaceId: SpaceId,
  registry: Registry.AtomRegistry,
): Effect.Effect<RemoteTriggerManager.Manager, never, Scope.Scope> =>
  Effect.gen(function* () {
    const triggers = Atom.make<readonly Trigger.State[]>([]);
    registry.mount(triggers);

    const refresh = Effect.tryPromise(() => getEdgeClient().getSpaceTriggers(DxosContext.default(), spaceId)).pipe(
      Effect.tap((response) => Effect.sync(() => registry.update(triggers, () => response.triggers.map(toState)))),
      // The endpoint may be unimplemented or unreachable; a failed poll must not tear down the layer.
      Effect.catch(() => Effect.void),
    );

    // Poll the EDGE dispatcher on an interval; the fiber is scoped to the layer's lifetime.
    yield* refresh.pipe(Effect.repeat(Schedule.spaced(POLL_INTERVAL)), Effect.forkScoped);

    return {
      triggers,
      invokeTrigger: (options: Trigger.InvokeOptions) =>
        // Manual invocation of a remote trigger maps onto force-running its cron on the EDGE
        // dispatcher; refresh the view promptly afterwards.
        Effect.tryPromise(() =>
          getEdgeClient().forceRunCronTrigger(DxosContext.default(), spaceId, options.trigger.id),
        ).pipe(
          Effect.tapError((error) =>
            Effect.sync(() => log.warn('edge force-run failed; retrying', { triggerId: options.trigger.id, error })),
          ),
          Effect.retry({ schedule: REPLICATION_BACKOFF }),
          Effect.asVoid,
          Effect.orDie,
          Effect.tap(() => refresh),
        ),
    } satisfies RemoteTriggerManager.Manager;
  });

/**
 * For tests: provide a pre-built edge client.
 */
export const fromEdgeClient = (
  edgeClient: EdgeClient,
  spaceId: SpaceId,
): Layer.Layer<RemoteTriggerManager.Service, never, Registry.AtomRegistry> =>
  Layer.effect(
    RemoteTriggerManager.Service,
    Effect.gen(function* () {
      const registry = yield* Registry.AtomRegistry;
      return yield* make(() => edgeClient, spaceId, registry);
    }),
  );

/**
 * Build from a `Client`, deferring edge-client creation until first use
 * (identity may be absent at boot).
 */
export const fromClient = (
  client: Client,
  spaceId: SpaceId,
): Layer.Layer<RemoteTriggerManager.Service, never, Registry.AtomRegistry> =>
  Layer.effect(
    RemoteTriggerManager.Service,
    Effect.gen(function* () {
      const registry = yield* Registry.AtomRegistry;
      let cached: EdgeClient | undefined;
      return yield* make(() => (cached ??= createEdgeClient(client)), spaceId, registry);
    }),
  );

/**
 * Build from the ambient `ClientService`.
 */
export const layer = (
  spaceId: SpaceId,
): Layer.Layer<RemoteTriggerManager.Service, never, Registry.AtomRegistry | ClientService> =>
  Layer.effect(
    RemoteTriggerManager.Service,
    Effect.gen(function* () {
      const client = yield* ClientService;
      const registry = yield* Registry.AtomRegistry;
      let cached: EdgeClient | undefined;
      return yield* make(() => (cached ??= createEdgeClient(client)), spaceId, registry);
    }),
  );
