//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability, Common } from '@dxos/app-framework';
import { SubscriptionList } from '@dxos/async';
import { Filter, Obj, Type } from '@dxos/echo';
import { scheduledEffect } from '@dxos/echo-signals/core';
import { log } from '@dxos/log';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { ClientCapabilities } from '@dxos/plugin-client';
import { DeckCapabilities } from '@dxos/plugin-deck';
import { Graph } from '@dxos/plugin-graph';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { PublicKey } from '@dxos/react-client';
import { SpaceState, parseId } from '@dxos/react-client/echo';
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

    const { invoke, invokePromise } = yield* Capability.get(Common.Capability.OperationInvoker);
    const { graph } = yield* Capability.get(Common.Capability.AppGraph);
    const layout = yield* Capability.get(Common.Capability.Layout);
    const deckStates = yield* Capability.getAll(DeckCapabilities.DeckState);
    const deck = deckStates.flat()[0];
    const attention = yield* Capability.get(AttentionCapabilities.Attention);
    const state = yield* Capability.get(SpaceCapabilities.MutableState);
    const client = yield* Capability.get(ClientCapabilities.Client);

    const defaultSpace = client.spaces.default;
    yield* Effect.tryPromise(() => defaultSpace.waitUntilReady());

    if (deck?.activeDeck === 'default') {
      yield* invoke(Common.LayoutOperation.SwitchWorkspace, { subject: defaultSpace.id });
    }

    // Initialize space sharing lock in default space.
    if (typeof defaultSpace.properties[COMPOSER_SPACE_LOCK] !== 'boolean') {
      defaultSpace.properties[COMPOSER_SPACE_LOCK] = true;
    }

    const queryResults = yield* Effect.tryPromise(() =>
      defaultSpace.db.query(Filter.type(Type.Expando, { key: SHARED })).run(),
    );
    const spacesOrder = queryResults[0];
    if (!spacesOrder) {
      // TODO(wittjosiah): Cannot be a Folder because Spaces are not TypedObjects so can't be saved in the database.
      //  Instead, we store order as an array of space ids.
      defaultSpace.db.add(Obj.make(Type.Expando, { key: SHARED, order: [] }));
    }

    // Await missing objects.
    subscriptions.add(
      scheduledEffect(
        () => ({ active: layout.active }),
        ({ active }) => {
          if (active.length !== 1) {
            return;
          }

          const id = active[0];
          const node = Graph.getNode(graph, id).pipe(Option.getOrNull);
          if (!node && id.length === ECHO_DXN_LENGTH) {
            void Graph.initialize(graph, id);
            const timeout = setTimeout(async () => {
              const node = Graph.getNode(graph, id).pipe(Option.getOrNull);
              if (!node) {
                await invokePromise(SpaceOperation.WaitForObject, { id });
              }
            }, WAIT_FOR_OBJECT_TIMEOUT);

            return () => clearTimeout(timeout);
          }
        },
      ),
    );

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
            subscriptions.add(
              scheduledEffect(
                () => ({ name: space.properties.name }),
                ({ name }) => {
                  if (!name) {
                    delete state.spaceNames[space.id];
                  } else {
                    state.spaceNames[space.id] = name;
                  }
                },
              ),
            );
          });
      }).unsubscribe,
    );

    // Broadcast active node to other peers in the space.
    subscriptions.add(
      scheduledEffect(
        () => ({
          current: attention.current,
          active: layout.active,
          inactive: layout.inactive,
        }),
        ({ current, active, inactive }) => {
          const send = () => {
            const spaces = client.spaces.get();
            const identity = client.halo.identity.get();
            if (identity) {
              // Group parts by space for efficient messaging.
              const idsBySpace = reduceGroupBy(active, (id) => {
                try {
                  const { spaceId } = parseId(id);
                  return spaceId;
                } catch {
                  return null;
                }
              });

              const removedBySpace = reduceGroupBy(inactive, (id) => {
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
          return () => clearInterval(interval);
        },
      ),
    );

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
                added.forEach((id) => {
                  if (typeof id === 'string') {
                    if (!(id in state.viewersByObject)) {
                      state.viewersByObject[id] = new ComplexMap(PublicKey.hash);
                    }
                    state.viewersByObject[id]!.set(identityKey, {
                      lastSeen: Date.now(),
                      currentlyAttended: new Set(attended).has(id),
                    });
                    if (!state.viewersByIdentity.has(identityKey)) {
                      state.viewersByIdentity.set(identityKey, new Set());
                    }
                    state.viewersByIdentity.get(identityKey)!.add(id);
                  }
                });

                removed.forEach((id) => {
                  if (typeof id === 'string') {
                    state.viewersByObject[id]?.delete(identityKey);
                    state.viewersByIdentity.get(identityKey)?.delete(id);
                    // It’s okay for these to be empty sets/maps, reduces churn.
                  }
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
      state.enabledEdgeReplication = true;
    } catch (err) {
      log.catch(err);
    }

    return Capability.contributes(Common.Capability.Null, null, () =>
      Effect.sync(() => {
        spaceSubscriptions.clear();
        subscriptions.clear();
      }),
    );
  }),
);
