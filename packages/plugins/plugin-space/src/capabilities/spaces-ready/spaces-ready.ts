//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { SubscriptionList } from '@dxos/async';
import { Filter, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Graph } from '@dxos/plugin-graph';
import { EdgeReplicationSetting } from '@dxos/protocols/buf/dxos/echo/metadata_pb';
import { PublicKey } from '@dxos/react-client';
import { SPACE_ID_LENGTH, SpaceState, parseId } from '@dxos/react-client/echo';
import { Expando } from '@dxos/schema';
import { ComplexMap, reduceGroupBy } from '@dxos/util';

import { SpaceCapabilities, SpaceOperation } from '../../types';
import { COMPOSER_SPACE_LOCK, SHARED } from '../../util';

const ACTIVE_NODE_BROADCAST_INTERVAL = 30_000;
const WAIT_FOR_OBJECT_TIMEOUT = 5_000;

// E.g., dxn:echo:BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE:01J00J9B45YHYSGZQTQMSKMGJ6
const ECHO_DXN_LENGTH = 3 + 1 + 4 + 1 + 33 + 1 + 26;

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const subscriptions = new SubscriptionList();
    const spaceSubscriptions = new SubscriptionList();

    const { invoke, invokePromise } = yield* Capability.get(Capabilities.OperationInvoker);
    const { graph } = yield* Capability.get(AppCapabilities.AppGraph);
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const layoutAtom = yield* Capability.get(AppCapabilities.Layout);
    const attention = yield* Capability.get(AttentionCapabilities.Attention);
    const stateAtom = yield* Capability.get(SpaceCapabilities.State);
    const ephemeralAtom = yield* Capability.get(SpaceCapabilities.EphemeralState);
    const client = yield* Capability.get(ClientCapabilities.Client);

    const defaultSpace = client.spaces.default;
    yield* Effect.tryPromise(() => defaultSpace.waitUntilReady());

    // Check if deck state indicates we should switch to default space.
    const layout = registry.get(layoutAtom);
    if (layout.workspace === 'default') {
      yield* invoke(LayoutOperation.SwitchWorkspace, { subject: defaultSpace.id });
    }

    // Initialize space sharing lock in default space.
    if (typeof defaultSpace.properties[COMPOSER_SPACE_LOCK] !== 'boolean') {
      Obj.change(defaultSpace.properties, (p) => {
        p[COMPOSER_SPACE_LOCK] = true;
      });
    }

    const queryResults = yield* Effect.tryPromise(() =>
      defaultSpace.db.query(Filter.type(Expando.Expando, { key: SHARED })).run(),
    );
    const spacesOrder = queryResults[0];
    if (!spacesOrder) {
      // TODO(wittjosiah): Cannot be a Folder because Spaces are not TypedObjects so can't be saved in the database.
      //  Instead, we store order as an array of space ids.
      defaultSpace.db.add(Obj.make(Expando.Expando, { key: SHARED, order: [] }));
    }

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
          if (!node && (id.length === ECHO_DXN_LENGTH || id.length === SPACE_ID_LENGTH)) {
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
    subscriptions.add(
      client.spaces.subscribe(async (spaces) => {
        // TODO(wittjosiah): Remove. This is a hack to be able to migrate the default space properties.
        if (defaultSpace.state.get() === SpaceState.SPACE_REQUIRES_MIGRATION) {
          await defaultSpace.internal.migrate();
        }

        spaces
          .filter((space) => space.state.get() === SpaceState.SPACE_READY)
          .forEach((space) => {
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
      }).unsubscribe,
    );

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
        const identity = client.halo.identity.get();
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
                identityKey: identity.identityKey.toHex(),
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
    subscriptions.add(
      client.spaces.subscribe((spaces) => {
        spaceSubscriptions.clear();
        spaces.forEach((space) => {
          spaceSubscriptions.add(
            space.listen('viewing', (message) => {
              const { added, removed, attended } = message.payload;

              const identityKey = PublicKey.safeFrom(message.payload.identityKey);
              const currentIdentity = client.halo.identity.get();
              if (
                identityKey &&
                !currentIdentity?.identityKey.equals(identityKey) &&
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
      }).unsubscribe,
    );

    // Enable edge replication for all spaces.
    try {
      yield* Effect.tryPromise(() =>
        Promise.all(
          client.spaces
            .get()
            .map((space) => space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED)),
        ),
      );
      registry.update(stateAtom, (current) => ({ ...current, enabledEdgeReplication: true }));
    } catch (err) {
      log.catch(err);
    }

    return Capability.contributes(Capabilities.Null, null, () =>
      Effect.sync(() => {
        spaceSubscriptions.clear();
        subscriptions.clear();
      }),
    );
  }),
);
