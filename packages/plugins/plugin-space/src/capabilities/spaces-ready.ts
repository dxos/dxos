//
// Copyright 2025 DXOS.org
//

import { contributes, createIntent, type PluginsContext, Capabilities, LayoutAction } from '@dxos/app-framework';
import { EventSubscriptions } from '@dxos/async';
import { Expando } from '@dxos/echo-schema';
import { scheduledEffect } from '@dxos/echo-signals/core';
import { create } from '@dxos/live-object';
import { log } from '@dxos/log';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { ClientCapabilities } from '@dxos/plugin-client';
import { DeckCapabilities } from '@dxos/plugin-deck';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { PublicKey } from '@dxos/react-client';
import { Filter, FQ_ID_LENGTH, parseFullyQualifiedId, SpaceState } from '@dxos/react-client/echo';
import { ComplexMap, reduceGroupBy } from '@dxos/util';

import { SpaceCapabilities } from './capabilities';
import { SpaceAction } from '../types';
import { COMPOSER_SPACE_LOCK, SHARED } from '../util';

const ACTIVE_NODE_BROADCAST_INTERVAL = 30_000;
const WAIT_FOR_OBJECT_TIMEOUT = 1000;

export default async (context: PluginsContext) => {
  const subscriptions = new EventSubscriptions();
  const spaceSubscriptions = new EventSubscriptions();

  const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
  const { graph } = context.requestCapability(Capabilities.AppGraph);
  const layout = context.requestCapability(Capabilities.Layout);
  const deck = context.requestCapability(DeckCapabilities.DeckState);
  const attention = context.requestCapability(AttentionCapabilities.Attention);
  const state = context.requestCapability(SpaceCapabilities.MutableState);
  const client = context.requestCapability(ClientCapabilities.Client);

  const defaultSpace = client.spaces.default;
  await defaultSpace.waitUntilReady();

  if (deck.activeDeck === 'default') {
    await dispatch(createIntent(LayoutAction.SwitchWorkspace, { part: 'workspace', subject: defaultSpace.id }));
  }

  // Initialize space sharing lock in default space.
  if (typeof defaultSpace.properties[COMPOSER_SPACE_LOCK] !== 'boolean') {
    defaultSpace.properties[COMPOSER_SPACE_LOCK] = true;
  }

  const {
    objects: [spacesOrder],
  } = await defaultSpace.db.query(Filter.schema(Expando, { key: SHARED })).run();
  if (!spacesOrder) {
    // TODO(wittjosiah): Cannot be a Folder because Spaces are not TypedObjects so can't be saved in the database.
    //  Instead, we store order as an array of space ids.
    defaultSpace.db.add(create({ key: SHARED, order: [] }));
  }

  // Await missing objects.
  subscriptions.add(
    scheduledEffect(
      () => ({ active: layout.active }),
      ({ active }) => {
        if (active.length !== 1) {
          return;
        }

        const node = graph.findNode(active[0]);
        if (!node && active[0].length === FQ_ID_LENGTH) {
          const timeout = setTimeout(async () => {
            const node = graph.findNode(active[0]);
            if (!node) {
              await dispatch(createIntent(SpaceAction.WaitForObject, { id: active[0] }));
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
              ({ name }) => (state.spaceNames[space.id] = name),
            ),
          );
        });
    }).unsubscribe,
  );

  // Broadcast active node to other peers in the space.
  subscriptions.add(
    scheduledEffect(
      () => ({ current: attention.current, active: layout.active, inactive: layout.inactive }),
      ({ current, active, inactive }) => {
        const send = () => {
          const spaces = client.spaces.get();
          const identity = client.halo.identity.get();
          if (identity) {
            // Group parts by space for efficient messaging.
            const idsBySpace = reduceGroupBy(active, (id) => {
              try {
                const [spaceId] = parseFullyQualifiedId(id);
                return spaceId;
              } catch {
                return null;
              }
            });

            const removedBySpace = reduceGroupBy(inactive, (id) => {
              try {
                const [spaceId] = parseFullyQualifiedId(id);
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
                  log.warn('Failed to broadcast active node for presence.', { err: err.message });
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
    await Promise.all(
      client.spaces.get().map((space) => space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED)),
    );
    state.enabledEdgeReplication = true;
  } catch (err) {
    log.catch(err);
  }

  return contributes(Capabilities.Null, null, () => {
    spaceSubscriptions.clear();
    subscriptions.clear();
  });
};
