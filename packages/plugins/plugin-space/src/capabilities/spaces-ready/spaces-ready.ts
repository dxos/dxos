//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, LayoutOperation, getPersonalSpace, getSpacePath, setPersonalSpace } from '@dxos/app-toolkit';
import { SubscriptionList } from '@dxos/async';
import { Filter, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Graph } from '@dxos/plugin-graph';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { PublicKey } from '@dxos/react-client';
import { type Space, SPACE_ID_LENGTH, SpaceState, parseId } from '@dxos/react-client/echo';
import { Expando } from '@dxos/schema';
import { ComplexMap, reduceGroupBy } from '@dxos/util';

import { SpaceCapabilities } from '../../types';
import { SpaceOperation } from '../../operations';
import { SHARED } from '../../util';

const ACTIVE_NODE_BROADCAST_INTERVAL = 30_000;
const WAIT_FOR_OBJECT_TIMEOUT = 5_000;

// E.g., dxn:echo:BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE:01J00J9B45YHYSGZQTQMSKMGJ6
const ECHO_DXN_LENGTH = 3 + 1 + 4 + 1 + 33 + 1 + 26;

/**
 * Resolve the personal space, migrating from legacy DefaultSpace credential if needed.
 * Returns undefined for new users who haven't created an identity yet.
 */
const resolvePersonalSpace = (client: {
  spaces: { get(): Space[]; get(id: any): Space | undefined };
  halo: { queryCredentials(options: { type: string }): any[] };
}): { space: Space; fromCredential: boolean } | undefined => {
  // Check for personal space via tags or __DEFAULT__ property.
  const found = getPersonalSpace(client);
  if (found) {
    return { space: found, fromCredential: false };
  }

  // Migration: read the legacy DefaultSpace credential from HALO.
  const defaultSpaceCredential = client.halo.queryCredentials({
    type: 'dxos.halo.credentials.DefaultSpace',
  })[0];
  if (!defaultSpaceCredential) {
    // New user — no credential, no personal space yet.
    return undefined;
  }

  const defaultSpaceId = defaultSpaceCredential.subject.assertion.spaceId;
  const space = client.spaces.get(defaultSpaceId);
  return space ? { space, fromCredential: true } : undefined;
};

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

    //
    // Personal space initialization — deferred until found.
    //

    let personalSpaceInitialized = false;
    const initializePersonalSpace = async (personalSpace: Space, { fromCredential }: { fromCredential: boolean }) => {
      if (personalSpaceInitialized) {
        return;
      }
      personalSpaceInitialized = true;

      await personalSpace.waitUntilReady();

      // Only set the __DEFAULT__ property when migrating from the legacy credential.
      // Spaces created with the personal tag don't need it.
      if (fromCredential) {
        setPersonalSpace(personalSpace);
      }

      // Check if deck state indicates we should switch to default space.
      const layout = registry.get(layoutAtom);
      if (layout.workspace === 'default') {
        await invoke(LayoutOperation.SwitchWorkspace, { subject: getSpacePath(personalSpace.id) }).pipe(
          Effect.runPromise,
        );
      }

      const queryResults = await personalSpace.db.query(Filter.type(Expando.Expando, { key: SHARED })).run();
      const spacesOrder = queryResults[0];
      if (!spacesOrder) {
        // TODO(wittjosiah): Cannot be a Folder because Spaces are not TypedObjects so can't be saved in the database.
        //  Instead, we store order as an array of space ids.
        personalSpace.db.add(Obj.make(Expando.Expando, { key: SHARED, order: [] }));
      }
    };

    // Try to find the personal space now, or subscribe to find it later.
    const resolved = resolvePersonalSpace(client);
    if (resolved) {
      yield* Effect.tryPromise(() => initializePersonalSpace(resolved.space, resolved));
    } else {
      subscriptions.add(
        client.spaces.subscribe(() => {
          const resolved = resolvePersonalSpace(client);
          if (resolved) {
            void initializePersonalSpace(resolved.space, resolved);
          }
        }).unsubscribe,
      );
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
        // TODO(wittjosiah): Remove. This is a hack to be able to migrate the personal space properties.
        const personalSpace = getPersonalSpace(client);
        if (personalSpace && personalSpace.state.get() === SpaceState.SPACE_REQUIRES_MIGRATION) {
          await personalSpace.internal.migrate();
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
