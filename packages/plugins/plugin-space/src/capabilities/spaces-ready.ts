//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Option from 'effect/Option';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { SubscriptionList } from '@dxos/async';
import { Annotation, Collection, Obj, Type } from '@dxos/echo';
import { SPACE_ID_LENGTH, parseId } from '@dxos/keys';
import { log } from '@dxos/log';
import { Migrations, MigrationVersionAnnotation } from '@dxos/migrations';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { Graph } from '@dxos/plugin-graph';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { PublicKey } from '@dxos/react-client';
import { type Space, SpaceState } from '@dxos/react-client/echo';
import { ComplexMap, reduceGroupBy } from '@dxos/util';

import { SpaceOperation } from '#operations';

import { ensureSettingsSpace, migrateToSettingsSpace } from '../settings-space';
import * as SpaceCapabilities from '../types/SpaceCapabilities';

const ACTIVE_NODE_BROADCAST_INTERVAL = 30_000;
const WAIT_FOR_OBJECT_TIMEOUT = 5_000;

const isEchoRef = (id: string) => id.startsWith('echo:/');

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
    // Settings space bootstrap and one-time migration — deferred until a space is found.
    //

    // Fiber for the one-shot settings-space init Effect; interrupted in cleanup
    // so it cannot access the db after client.destroy() closes the repo.
    let settingsSpaceInitFiber: Fiber.RuntimeFiber<void, unknown> | undefined;
    let settingsSpaceInitialized = false;

    const settingsSpaceInitEffect = (legacySpace: Space | undefined, { fromCredential }: { fromCredential: boolean }) =>
      Effect.gen(function* () {
        if (legacySpace) {
          yield* Effect.promise(() => legacySpace.waitUntilReady());
          if (fromCredential) {
            AppSpace.setLegacyPersonalSpace(legacySpace);
          }
        }

        const settingsSpace = yield* ensureSettingsSpace(client);
        yield* migrateToSettingsSpace({ settingsSpace, legacySpace });

        // Check if deck state indicates we should switch to the personal space.
        const personalSpace = AppSpace.getPersonalSpace(client);
        const layout = registry.get(layoutAtom);
        if (layout.workspace === 'default' && personalSpace) {
          yield* invoke(LayoutOperation.SwitchWorkspace, { subject: GraphPath.getSpacePath(personalSpace.id) });
        }
      });

    const startSettingsSpaceInit = (legacySpace: Space | undefined, opts: { fromCredential: boolean }) => {
      if (settingsSpaceInitialized) {
        return;
      }
      // Set before forking so concurrent subscribe callbacks don't start a second initialization.
      settingsSpaceInitialized = true;
      settingsSpaceInitFiber = Effect.runFork(settingsSpaceInitEffect(legacySpace, opts));
    };

    // Try to resolve a space to migrate from now, or subscribe to find one later. A profile that
    // already has a settings space still runs the init so the ordering object is repaired if missing.
    // Initialization is non-blocking so subscriptions wire immediately.
    const tryStartSettingsSpaceInit = () => {
      const legacy = AppSpace.resolveLegacyPersonalSpace(client);
      if (legacy || AppSpace.getSettingsSpace(client)) {
        startSettingsSpaceInit(legacy?.space, { fromCredential: legacy?.fromCredential ?? false });
        return true;
      }
      return false;
    };

    if (!tryStartSettingsSpaceInit()) {
      const settingsSpaceSub = client.spaces.subscribe(() => {
        tryStartSettingsSpaceInit();
      });
      subscriptions.add(() => settingsSpaceSub.unsubscribe());
    }

    //
    // Space subscriptions — set up immediately, do not depend on personal space.
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

          const node = Graph.getNode(graph, id).pipe(Option.getOrNull);
          if (!node && (isEchoRef(id) || id.length === SPACE_ID_LENGTH)) {
            // Fire any `resolver` extension for the id first; the timeout below is the fallback when
            // nothing materializes it.
            void Graph.initialize(graph, id);
            const timeout = setTimeout(async () => {
              const node = Graph.getNode(graph, id).pipe(Option.getOrNull);
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
    const spaceNamesSub = client.spaces.subscribe(async (spaces) => {
      // TODO(wittjosiah): Remove. This is a hack to be able to migrate the personal space properties.
      const legacySpaceForMigration = AppSpace.resolveLegacyPersonalSpace(client);
      if (
        legacySpaceForMigration?.space &&
        legacySpaceForMigration.space.state.get() === SpaceState.SPACE_REQUIRES_MIGRATION
      ) {
        await legacySpaceForMigration.space.internal.migrate();
      }

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
      Effect.catchAll((err) => Effect.sync(() => log.catch(err))),
    );
    registry.update(stateAtom, (current) => ({ ...current, enabledEdgeReplication: true }));

    yield* Effect.addFinalizer(() =>
      Effect.gen(function* () {
        if (settingsSpaceInitFiber) {
          yield* Fiber.interrupt(settingsSpaceInitFiber);
        }
        spaceSubscriptions.clear();
        subscriptions.clear();
      }),
    );
    return [];
  }),
);
