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
import { type Client } from '@dxos/client';
import { type Space, SpaceState } from '@dxos/client/echo';
import { DeviceType, getDeviceLabel } from '@dxos/client/halo';
import { Annotation, Collection, Obj, Type } from '@dxos/echo';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Migrations, MigrationVersionAnnotation } from '@dxos/migrations';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { unpackJson } from '@dxos/protocols/buf';
import { EdgeReplicationSetting } from '@dxos/protocols/buf/dxos/echo/metadata_pb';
import { ViewLocation } from '@dxos/react-ui-attention/types';

import { SpaceCapabilities, type SpaceSchema } from '#types';

import { migrateToSettingsSpace } from '../migrations/settings-space.ts';
import {
  FOLLOW_BROADCAST_INTERVAL,
  LOCATION_BROADCAST_INTERVAL,
  PRESENCE_BROADCAST_INTERVAL,
  PRESENCE_EXPIRY,
  applyPeerDeck,
  applyViewingMessage,
  getPresenceKeyFromPath,
  groupPresenceChangesBySpace,
  groupPresenceKeysBySpace,
  isFollowTargetOf,
  isSameFollowTarget,
  parseViewingMessage,
} from '../util/presence.ts';
import { catchNonInterrupt, resolveSettingsSpace, runSettingsSpaceHealing } from '../util/settings-space.ts';

const DEVICE_KINDS: Record<DeviceType, SpaceSchema.SessionDevice['kind']> = {
  [DeviceType.UNKNOWN]: 'unknown',
  [DeviceType.BROWSER]: 'browser',
  [DeviceType.NATIVE]: 'native',
  [DeviceType.MOBILE]: 'mobile',
  [DeviceType.AGENT]: 'agent',
  [DeviceType.AGENT_MANAGED]: 'agent',
};

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

    const { invoke } = yield* Capabilities.OperationInvoker;
    const registry = yield* Capabilities.AtomRegistry;
    const layoutAtom = yield* AppCapabilities.Layout;
    const attention = yield* AttentionCapabilities.Attention;
    const viewState = yield* AttentionCapabilities.ViewState;
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

    // Only the defined fields: the payload is packed as a protobuf Struct, which has no undefined.
    const getLocations = (keys: readonly string[]) =>
      Object.fromEntries(
        keys.flatMap((key) => {
          const { selection, viewport } = viewState.get(ViewLocation.aspect, key);
          return selection || viewport
            ? [[key, { ...(selection && { selection }), ...(viewport && { viewport }) }]]
            : [];
        }),
      );

    // One session per running app, so peers tell this tab apart from the same identity's others.
    const sessionId = PublicKey.random().toHex();
    const getDevice = (): SpaceSchema.SessionDevice | undefined => {
      const profile = client.halo.device?.profile;
      if (!profile) {
        return undefined;
      }
      const label = getDeviceLabel(profile);
      const kind = profile.type !== undefined ? DEVICE_KINDS[profile.type] : undefined;
      return {
        ...(label && { label }),
        ...(profile.platform && { platform: profile.platform }),
        ...(profile.os && { os: profile.os }),
        ...(kind && { kind }),
      };
    };

    // Sessions that follow this one, by space, identity and session, with when they last said so.
    const followers = new Map<string, number>();
    const isFollowed = (now: number) => [...followers.values()].some((lastSeen) => now - lastSeen < PRESENCE_EXPIRY);

    // Broadcast active node to other peers in the space - subscribe to both layout and attention.
    let broadcastCleanup: (() => void) | undefined;
    let previousActive: readonly string[] = [];
    const setupBroadcast = () => {
      broadcastCleanup?.();

      const layout = registry.get(layoutAtom);
      const current = attention.getCurrent();
      const active = layout.active;
      const departed = previousActive.filter((id) => !active.includes(id));
      const inactive = [...layout.inactive, ...departed];
      previousActive = active;

      const send = () => {
        const spaces = client.spaces.get();
        const identity = Option.getOrUndefined(haloIdentity.getSnapshot());
        if (identity) {
          const device = getDevice();
          const following = registry.get(ephemeralAtom).following;
          const attendedBySpace = groupPresenceKeysBySpace([...current]);
          const changesBySpace = groupPresenceChangesBySpace(active, inactive);

          for (const space of spaces) {
            const { added, removed } = changesBySpace.get(space.id) ?? { added: [], removed: [] };
            const attended = attendedBySpace.get(space.id) ?? [];
            void space
              .postMessage('viewing', {
                identityKey: identity.identityKey ?? '',
                sessionId,
                ...(device && { device }),
                attended,
                added,
                removed,
                locations: getLocations(attended),
                ...(following?.spaceId === space.id && {
                  following: {
                    identityKey: following.identityKey,
                    ...(following.sessionId && { sessionId: following.sessionId }),
                  },
                }),
                deck: { planks: active.filter((path) => GraphPath.getSpaceIdFromPath(path) === space.id) },
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
      const interval = setInterval(() => send(), PRESENCE_BROADCAST_INTERVAL);

      // Moving or scrolling in an attended object re-sends, at most once per interval, which is shorter while followed.
      let locationTimer: ReturnType<typeof setTimeout> | undefined;
      const scheduleSend = () => {
        locationTimer ??= setTimeout(
          () => {
            locationTimer = undefined;
            send();
          },
          isFollowed(Date.now()) ? FOLLOW_BROADCAST_INTERVAL : LOCATION_BROADCAST_INTERVAL,
        );
      };
      const locationSubscriptions = [...current].flatMap((path) => {
        const key = getPresenceKeyFromPath(path);
        return key ? [viewState.subscribe(ViewLocation.aspect, key, scheduleSend)] : [];
      });

      broadcastCleanup = () => {
        clearInterval(interval);
        clearTimeout(locationTimer);
        locationSubscriptions.forEach((unsubscribe) => unsubscribe());
      };
    };

    // Subscribe to layout changes for broadcast.
    subscriptions.add(registry.subscribe(layoutAtom, setupBroadcast));
    // Subscribe to attention.current changes.
    subscriptions.add(attention.subscribeCurrent(() => setupBroadcast()));
    // Starting, retargeting or stopping a follow tells the space at once, so the leader's rate changes with it.
    let previousFollowing = registry.get(ephemeralAtom).following;
    subscriptions.add(
      registry.subscribe(ephemeralAtom, ({ following }) => {
        if (!isSameFollowTarget(following, previousFollowing)) {
          previousFollowing = following;
          setupBroadcast();
        }
      }),
    );
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
            // The gossip payload travels as a `google.protobuf.Struct` packed in an `Any`, so it
            // arrives as opaque JSON that has to be narrowed rather than destructured as typed.
            const viewing = parseViewingMessage(unpackJson(message.payload) ?? {});
            const identityKey = viewing && PublicKey.safeFrom(viewing.identityKey);
            const currentIdentity = Option.getOrUndefined(haloIdentity.getSnapshot());
            if (viewing && identityKey && currentIdentity?.identityKey !== identityKey.toHex()) {
              const peer = identityKey.toHex();
              const lastSeen = Date.now();
              const follower = `${space.id}/${peer}/${viewing.sessionId ?? peer}`;
              if (isFollowTargetOf(viewing.following, currentIdentity?.identityKey ?? '', sessionId)) {
                // A new follower needs the location now, not at the next move or heartbeat.
                const isNew = !followers.has(follower);
                followers.set(follower, lastSeen);
                if (isNew) {
                  setupBroadcast();
                }
              } else {
                followers.delete(follower);
              }
              registry.update(ephemeralAtom, (ephemeral) => ({
                ...ephemeral,
                viewersByObject: applyViewingMessage(ephemeral.viewersByObject, peer, viewing, lastSeen),
                peerDecks: applyPeerDeck(ephemeral.peerDecks, space.id, peer, viewing),
              }));
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
