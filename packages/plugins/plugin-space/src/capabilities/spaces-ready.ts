//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Option from 'effect/Option';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { SubscriptionList } from '@dxos/async';
import { type Client } from '@dxos/client';
import { type Space, SpaceState } from '@dxos/client/echo';
import { Annotation, Collection, Obj, Type } from '@dxos/echo';
import { PublicKey, SPACE_ID_LENGTH, parseId } from '@dxos/keys';
import { log } from '@dxos/log';
import { Migrations, MigrationVersionAnnotation } from '@dxos/migrations';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { ComplexMap, reduceGroupBy } from '@dxos/util';

import { SpaceCapabilities, SpaceOperation } from '#types';

import { migrateToSettingsSpace } from '../migrations/settings-space';
import { catchNonInterrupt, resolveSettingsSpace, runSettingsSpaceHealing } from '../util/settings-space';

const ACTIVE_NODE_BROADCAST_INTERVAL = 30_000;
const WAIT_FOR_OBJECT_TIMEOUT = 5_000;

const isEchoRef = (id: string) => id.startsWith('echo:/');

/**
 * Resolve the designated default space, migrating a legacy profile into the settings space until
 * one exists.
 *
 * Both inputs land late: `setupIdentitySpaces` writes the designation only after the settings space
 * is already published to the space list, and a legacy space is only readable once it opens, which
 * can be after the settings space resolves. Migration is idempotent, so retrying on each change is
 * what recovers the ordering that would otherwise be lost.
 *
 * The settings space is re-resolved each pass: healing can tombstone the previous one, and a
 * destroyed proxy throws on property access.
 */
const resolveDefaultSpace = Effect.fnUntraced(function* (client: Client) {
  while (true) {
    const settingsSpace = AppSpace.getSettingsSpace(client);
    if (settingsSpace?.state.get() === SpaceState.SPACE_READY) {
      yield* migrateToSettingsSpace({ settingsSpace, legacySpace: AppSpace.resolveLegacyDefaultSpace(client) });
      const defaultSpace = AppSpace.getDefaultSpace(client);
      if (defaultSpace) {
        return defaultSpace;
      }
    }

    yield* awaitChange(client, settingsSpace);
  }
});

/**
 * The next space-list change or settings-space property write, the two events that can supply a
 * default space. The space list replays on subscribe, which would resolve this before anything has
 * changed, so the replay is skipped. Properties are only subscribable on a ready space; when it is
 * absent or unready, the transition that changes that arrives through the space list instead.
 */
const awaitChange = (client: Client, settingsSpace: Space | undefined): Effect.Effect<void> =>
  Effect.callback<void>((resume) => {
    let replayed = false;
    const spacesSub = client.spaces.subscribe(() => {
      if (replayed) {
        resume(Effect.void);
      }
      replayed = true;
    });
    const unsubscribe =
      settingsSpace?.state.get() === SpaceState.SPACE_READY
        ? Obj.subscribe(settingsSpace.properties, () => resume(Effect.void))
        : undefined;
    return Effect.sync(() => {
      spacesSub.unsubscribe();
      unsubscribe?.();
    });
  });

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const subscriptions = new SubscriptionList();
    const spaceSubscriptions = new SubscriptionList();

    const { invoke, invokePromise } = yield* Capabilities.OperationInvoker;
    const { graph } = yield* AppCapabilities.AppGraph;
    const registry = yield* Capabilities.AtomRegistry;
    const layoutAtom = yield* AppCapabilities.Layout;
    const attention = yield* AttentionCapabilities.Attention;
    const stateAtom = yield* SpaceCapabilities.State;
    const ephemeralAtom = yield* SpaceCapabilities.EphemeralState;
    const client = yield* ClientCapabilities.Client;
    const haloIdentity = yield* ClientCapabilities.IdentityService;

    //
    // Settings space bootstrap — one-shot, deferred until there is something to bootstrap from.
    //

    // Interrupted in cleanup so they cannot touch the db after client.destroy() closes the repo.
    let initFiber: Fiber.Fiber<void, unknown> | undefined;

    const initSettingsSpace = Effect.gen(function* () {
      yield* resolveSettingsSpace(client);
      const defaultSpace = yield* resolveDefaultSpace(client);

      // Only relevant on a cold boot with no workspace in the deck state.
      if (registry.get(layoutAtom).workspace === 'default') {
        yield* invoke(LayoutOperation.SwitchWorkspace, { subject: GraphPath.getSpacePath(defaultSpace.id) });
      }
    });

    // Concurrent healing can tombstone a space a pass is mid-write on; the raced state is gone, so
    // rerunning converges. Interruption passes through so cleanup still stops the fiber.
    const initSettingsSpaceSupervised = Effect.gen(function* () {
      while (true) {
        const done = yield* initSettingsSpace.pipe(
          Effect.as(true),
          catchNonInterrupt('settings space bootstrap failed, retrying'),
        );
        if (done) {
          return;
        }
        yield* Effect.sleep('1 second');
      }
    });

    // Converges duplicate settings spaces; self-gated (no-ops without tagged spaces), so it does
    // not wait on the bootstrap — welding it to that fiber's fate would silently disable healing
    // whenever bootstrap stalls or dies.
    const healFiber = Effect.runFork(
      runSettingsSpaceHealing(client).pipe(catchNonInterrupt('settings space healing stopped')),
    );

    // Deferred until a space exists to bootstrap from, so a client with no identity does not get a
    // settings space created for it. `subscribe` replays, so this covers the initial pass too.
    const spacesSub = client.spaces.subscribe(() => {
      if (initFiber || client.spaces.get().length === 0) {
        return;
      }
      initFiber = Effect.runFork(initSettingsSpaceSupervised);
    });
    subscriptions.add(() => spacesSub.unsubscribe());

    //
    // Space subscriptions — set up immediately, do not depend on default space.
    //

    // Await missing objects - subscribe to layout atom changes.
    // NOTE: Use immediate: true to check initial state (URL handler may have already set active).
    let lastActiveCleanup: (() => void) | undefined;
    subscriptions.add(
      registry.subscribe(
        layoutAtom,
        (layout) => {
          // Clean up previous effect.
          lastActiveCleanup?.();
          lastActiveCleanup = undefined;

          // Determine the ID to check - either from active item or workspace.
          const id = layout.active.length === 1 ? layout.active[0] : layout.workspace;
          if (!id) {
            return;
          }

          const node = AppGraph.getNode(graph, id).pipe(Option.getOrNull);
          if (!node && (isEchoRef(id) || id.length === SPACE_ID_LENGTH)) {
            const timeout = setTimeout(async () => {
              const node = AppGraph.getNode(graph, id).pipe(Option.getOrNull);
              if (!node) {
                await invokePromise(SpaceOperation.WaitForObject, { id });
              }
            }, WAIT_FOR_OBJECT_TIMEOUT);

            lastActiveCleanup = () => clearTimeout(timeout);
          }
        },
        { immediate: true },
      ),
    );
    // Also add cleanup for the last effect.
    subscriptions.add(() => lastActiveCleanup?.());

    // Cache space names.
    const spaceNamesSub = client.spaces.subscribe((spaces) => {
      spaces
        .filter((space) => space.state.get() === SpaceState.SPACE_READY)
        .forEach((space) => {
          if (Option.isNone(Annotation.get(space.properties, AppAnnotation.RootCollectionAnnotation))) {
            const legacyRef = (space.properties as any)[Type.getTypename(Collection.Collection)];
            if (legacyRef) {
              Obj.update(space.properties, (properties) => {
                Annotation.set(properties, AppAnnotation.RootCollectionAnnotation, legacyRef);
              });
            }
          }
          if (Migrations.namespace && Option.isNone(Annotation.get(space.properties, MigrationVersionAnnotation))) {
            const legacyVersion = (space.properties as any)[`${Migrations.namespace}.version`];
            if (typeof legacyVersion === 'string') {
              Obj.update(space.properties, (properties) => {
                Annotation.set(properties, MigrationVersionAnnotation, legacyVersion);
              });
            }
          }

          const updateSpaceName = () => {
            const name = space.properties.name;
            if (!name) {
              registry.update(stateAtom, (current) => {
                const { [space.id]: _, ...rest } = current.spaceNames;
                return { ...current, spaceNames: rest };
              });
            } else {
              registry.update(stateAtom, (current) => ({
                ...current,
                spaceNames: { ...current.spaceNames, [space.id]: name },
              }));
            }
          };
          updateSpaceName();
          subscriptions.add(Obj.subscribe(space.properties, updateSpaceName));
        });
    });
    subscriptions.add(() => spaceNamesSub.unsubscribe());

    // Broadcast active node to other peers in the space - subscribe to both layout and attention.
    let broadcastCleanup: (() => void) | undefined;
    const setupBroadcast = () => {
      broadcastCleanup?.();

      const layout = registry.get(layoutAtom);
      const current = attention.getCurrent();
      const active = layout.active;
      const inactive = layout.inactive;

      const send = () => {
        const spaces = client.spaces.get();
        const identity = Option.getOrUndefined(haloIdentity.getSnapshot());
        if (identity) {
          // Group parts by space for efficient messaging.
          const idsBySpace = reduceGroupBy(active, (id: string) => {
            try {
              const { spaceId } = parseId(id);
              return spaceId;
            } catch {
              return null;
            }
          });

          const removedBySpace = reduceGroupBy(inactive, (id: string) => {
            try {
              const { spaceId } = parseId(id);
              return spaceId;
            } catch {
              return null;
            }
          });

          // NOTE: Ensure all spaces are included so that we send the correct `removed` object arrays.
          for (const space of spaces) {
            if (!idsBySpace.has(space.id)) {
              idsBySpace.set(space.id, []);
            }
          }

          for (const [spaceId, added] of idsBySpace) {
            const removed = removedBySpace.get(spaceId) ?? [];
            const space = spaces.find((space) => space.id === spaceId);
            if (!space) {
              continue;
            }

            void space
              .postMessage('viewing', {
                identityKey: identity.identityKey,
                attended: current,
                added,
                removed,
              })
              // TODO(burdon): This seems defensive; why would this fail? Backoff interval.
              .catch((err) => {
                log.warn('Failed to broadcast active node for presence.', {
                  err: err.message,
                });
              });
          }
        }
      };

      send();
      // Send at interval to allow peers to expire entries if they become disconnected.
      const interval = setInterval(() => send(), ACTIVE_NODE_BROADCAST_INTERVAL);
      broadcastCleanup = () => clearInterval(interval);
    };

    // Subscribe to layout changes for broadcast.
    subscriptions.add(registry.subscribe(layoutAtom, setupBroadcast));
    // Subscribe to attention.current changes.
    subscriptions.add(attention.subscribeCurrent(() => setupBroadcast()));
    // Initial setup.
    setupBroadcast();
    // Cleanup.
    subscriptions.add(() => broadcastCleanup?.());

    // Listen for active nodes from other peers in the space.
    const viewingSub = client.spaces.subscribe((spaces) => {
      spaceSubscriptions.clear();
      spaces.forEach((space) => {
        spaceSubscriptions.add(
          space.listen('viewing', (message) => {
            const { added, removed, attended } = message.payload;

            const identityKey = PublicKey.safeFrom(message.payload.identityKey);
            const currentIdentity = Option.getOrUndefined(haloIdentity.getSnapshot());
            if (
              identityKey &&
              currentIdentity?.identityKey !== identityKey.toHex() &&
              Array.isArray(added) &&
              Array.isArray(removed)
            ) {
              // TODO(wittjosiah): Stop using (Complex)Map inside reactive object.
              registry.update(ephemeralAtom, (ephemeral) => {
                added.forEach((id) => {
                  if (typeof id === 'string') {
                    if (!(id in ephemeral.viewersByObject)) {
                      ephemeral.viewersByObject[id] = new ComplexMap(PublicKey.hash);
                    }
                    ephemeral.viewersByObject[id]!.set(identityKey, {
                      lastSeen: Date.now(),
                      currentlyAttended: new Set(attended).has(id),
                    });
                    if (!ephemeral.viewersByIdentity.has(identityKey)) {
                      ephemeral.viewersByIdentity.set(identityKey, new Set());
                    }
                    ephemeral.viewersByIdentity.get(identityKey)!.add(id);
                  }
                });

                removed.forEach((id) => {
                  if (typeof id === 'string') {
                    ephemeral.viewersByObject[id]?.delete(identityKey);
                    ephemeral.viewersByIdentity.get(identityKey)?.delete(id);
                    // It's okay for these to be empty sets/maps, reduces churn.
                  }
                });

                return { ...ephemeral };
              });
            }
          }),
        );
      });
    });
    subscriptions.add(() => viewingSub.unsubscribe());

    // Enable edge replication for all spaces.
    // Per-space failures (e.g. a timeout waiting for the property to propagate) must not
    // block activation of the whole plugin, so each space is enabled independently.
    yield* Effect.tryPromise(() =>
      Promise.allSettled(
        client.spaces
          .get()
          .filter((space) => space.internal.data.edgeReplication !== EdgeReplicationSetting.ENABLED)
          .map((space) => space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED)),
      ),
    ).pipe(
      Effect.tap((results) =>
        Effect.sync(() => {
          results.forEach((result) => {
            if (result.status === 'rejected') {
              log.catch(result.reason);
            }
          });
        }),
      ),
      Effect.catch((err) => Effect.sync(() => log.catch(err))),
    );
    registry.update(stateAtom, (current) => ({ ...current, enabledEdgeReplication: true }));

    yield* Effect.addFinalizer(() =>
      Effect.gen(function* () {
        yield* Fiber.interrupt(healFiber);
        if (initFiber) {
          yield* Fiber.interrupt(initFiber);
        }
        spaceSubscriptions.clear();
        subscriptions.clear();
      }),
    );
    return [];
  }),
);
