//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Atom from 'effect/reactivity/Atom';
import * as Scope from 'effect/Scope';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { Obj } from '@dxos/echo';
import { EID } from '@dxos/keys';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { Attention } from '@dxos/react-ui-attention/types';

import { SpaceCapabilities } from '#types';

import { FOLLOW_LOST_TIMEOUT, getPeerFocus, getPresenceKeyFromPath } from '../util/presence.ts';

const TICK_INTERVAL = 500;

/** Keys that do nothing on their own, so pressing one does not break a follow. */
const MODIFIER_KEYS: ReadonlySet<string> = new Set(['Alt', 'Control', 'Meta', 'Shift']);

/** The follow running in the layout: the view handed to its locator, until its scope closes. */
type Session = {
  scope: Scope.Closeable;
  view: Atom.Writable<AppCapabilities.LayoutFollowView>;
  unsubscribe: () => void;
};

/** Whether an event happened inside a plank or companion of an object, as opposed to the sidebars or a popover. */
const isInObject = (target: EventTarget | null): boolean => {
  const id =
    target instanceof Element
      ? target.closest(Attention.ATTENDABLE_SELECTOR)?.getAttribute(Attention.ATTENDABLE_ATTRIBUTE)
      : undefined;
  return !!id && getPresenceKeyFromPath(id) !== undefined;
};

/** Whether an event selects an object's navtree row, opening it or scrolling the deck to it, not a row control. */
const isTreeNavigation = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element) || target.closest('button, input, textarea, [data-part="branch-trigger"]')) {
    return false;
  }
  const id = target.closest('[data-tree-row]')?.getAttribute('data-object-id');
  return !!id && getPresenceKeyFromPath(id) !== undefined;
};

/** Whether an event lands in the deck's main area, which holds and scrolls the planks, or in an object's companion. */
const isInDeck = (target: EventTarget | null): boolean =>
  (target instanceof Element && !!target.closest('main')) || isInObject(target);

/**
 * Follows the peer named by the ephemeral `following` state. The follower's layout shows the leader's view through its
 * `LayoutLocator`: their open items in the space, the object they attend, the anchor in each object, and their layout's
 * location when it has the same locator. The local user's own input in the deck or an object's companion, selecting an
 * object in the navtree, Escape, attending an object outside what is shown of the leader, leaving the space's workspace,
 * or the leader leaving the space ends it.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;
    const registry = yield* Capabilities.AtomRegistry;
    const layoutAtom = yield* AppCapabilities.Layout;
    const attention = yield* AttentionCapabilities.Attention;
    const ephemeralAtom = yield* SpaceCapabilities.EphemeralState;
    const client = yield* ClientCapabilities.Client;
    const layoutLocatorsAtom = capabilities.atom(AppCapabilities.LayoutLocator);

    let session: Session | undefined;
    let lostSince: number | undefined;
    // The path this session opens each attended object at, once it has loaded it, and the loads in flight.
    const localPaths = new Map<EID.EID, string>();
    const loading = new Map<EID.EID, Fiber.Fiber<void>>();

    const isFollowing = () => registry.get(ephemeralAtom).following !== undefined;

    const stop = () => registry.update(ephemeralAtom, (state) => ({ ...state, following: undefined }));

    const setPaused = (paused: boolean) =>
      registry.update(ephemeralAtom, (state) =>
        state.following && !!state.following.paused !== paused
          ? { ...state, following: { ...state.following, paused } }
          : state,
      );

    const end = () => {
      if (session) {
        session.unsubscribe();
        Effect.runFork(Scope.close(session.scope, Exit.void));
        session = undefined;
      }
      // A load still in flight would otherwise land after the follow ended.
      for (const fiber of loading.values()) {
        Effect.runFork(Fiber.interrupt(fiber));
      }
      loading.clear();
      localPaths.clear();
      lostSince = undefined;
    };

    // The path this session opens the attended object at: its own path once loaded, or the space's Home for a leader on
    // it, whose key names no object. An object this session cannot load yet (one the leader just made may not have
    // replicated) has none, and is loaded again on the next update.
    const getLocalPath = (spaceId: string, key: EID.EID) => {
      if (!EID.getEntityId(key)) {
        return GraphPath.getSpaceHomePath(spaceId);
      }
      const space = client.spaces.get().find((space) => space.id === spaceId);
      if (!localPaths.has(key) && space && !loading.has(key)) {
        const fiber = Effect.runFork(
          Effect.tryPromise(() => space.db.makeRef(key).load()).pipe(
            Effect.map((object) => {
              if (Obj.isObject(object)) {
                localPaths.set(key, GraphPath.getObjectPathFromObject(object));
              }
            }),
            Effect.catch(() => Effect.void),
            Effect.ensuring(Effect.sync(() => loading.delete(key))),
          ),
        );
        loading.set(key, fiber);
        fiber.addObserver(() => {
          if (localPaths.has(key)) {
            update();
          }
        });
      }
      return localPaths.get(key);
    };

    const start = (locator: AppCapabilities.LayoutLocator, view: AppCapabilities.LayoutFollowView) => {
      const scope = Effect.runSync(Scope.make());
      const viewAtom = Atom.make(view);
      const showing = Effect.runSync(locator.follow(viewAtom).pipe(Scope.provide(scope)));
      const unsubscribe = registry.subscribe(showing, (shows) => setPaused(!shows), { immediate: true });
      session = { scope, view: viewAtom, unsubscribe };
    };

    const update = () => {
      const { following, viewersByObject, peerDecks } = registry.get(ephemeralAtom);
      if (!following) {
        end();
        return;
      }

      const now = Date.now();
      const focus = getPeerFocus(viewersByObject, following.spaceId, following.identityKey, now, following.sessionId);
      if (!focus) {
        // Switching objects can leave a moment with nothing attended, so only a lasting absence ends the follow.
        lostSince ??= now;
        if (now - lostSince >= FOLLOW_LOST_TIMEOUT) {
          stop();
        }
        return;
      }

      lostSince = undefined;
      const [locator] = registry.get(layoutLocatorsAtom);
      if (!locator) {
        // No layout can show the leader's view.
        setPaused(true);
        return;
      }

      const deck = peerDecks[following.spaceId]?.[following.identityKey]?.[focus.sessionId];
      const active = deck?.planks ?? [];
      const getAnchor = (key: EID.EID) => {
        const location =
          key === focus.key
            ? focus.location
            : viewersByObject[key]?.[following.identityKey]?.[focus.sessionId]?.location;
        return location?.viewport ?? location?.selection;
      };
      const anchors: Record<EID.EID, string> = {};
      for (const key of new Set([...active.flatMap((plank) => getPresenceKeyFromPath(plank) ?? []), focus.key])) {
        const anchor = getAnchor(key);
        if (anchor) {
          anchors[key] = anchor;
        }
      }
      const path = active.find((plank) => getPresenceKeyFromPath(plank) === focus.key);
      const localPath = getLocalPath(following.spaceId, focus.key);
      const view: AppCapabilities.LayoutFollowView = {
        spaceId: following.spaceId,
        active,
        attended: { key: focus.key, ...(path && { path }), ...(localPath && { localPath }) },
        anchors,
        ...(deck?.layout?.id === locator.id && { location: deck.layout.location }),
      };

      if (!session) {
        start(locator, view);
      } else if (JSON.stringify(view) !== JSON.stringify(registry.get(session.view))) {
        registry.set(session.view, view);
      }
    };

    const unsubscribeState = registry.subscribe(ephemeralAtom, update);
    const tick = setInterval(update, TICK_INTERVAL);

    // Attending an object outside what is shown of the leader, or one in another space, is navigating away from them.
    const unsubscribeAttention = attention.subscribeCurrent(() => {
      if (!isFollowing() || !session) {
        return;
      }
      const { active, attended } = registry.get(session.view);
      const keys = attention.getCurrent().flatMap((path) => getPresenceKeyFromPath(path) ?? []);
      const followed = [...active.flatMap((path) => getPresenceKeyFromPath(path) ?? []), attended.key];
      if (keys.length > 0 && !keys.some((key) => followed.includes(key))) {
        stop();
      }
    });

    // Switching to Settings or another space is navigating away from them.
    let workspace = registry.get(layoutAtom).workspace;
    const unsubscribeLayout = registry.subscribe(layoutAtom, ({ workspace: next }) => {
      const previous = workspace;
      workspace = next;
      const { following } = registry.get(ephemeralAtom);
      if (following && next !== previous && previous === GraphPath.getSpacePath(following.spaceId)) {
        stop();
      }
    });

    const onPointer = (event: Event) => {
      if (isFollowing() && (isInDeck(event.target) || isTreeNavigation(event.target))) {
        stop();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        isFollowing() &&
        !MODIFIER_KEYS.has(event.key) &&
        (event.key === 'Escape' || isInDeck(event.target) || (event.key === 'Enter' && isTreeNavigation(event.target)))
      ) {
        stop();
      }
    };
    const listenerOptions = { capture: true, passive: true };
    window.addEventListener('pointerdown', onPointer, listenerOptions);
    window.addEventListener('wheel', onPointer, listenerOptions);
    window.addEventListener('touchmove', onPointer, listenerOptions);
    window.addEventListener('keydown', onKeyDown, listenerOptions);
    // Going back or forward in history is the follower's own navigation; the follow's own writes push, which fires none.
    const onPopState = () => {
      if (isFollowing()) {
        stop();
      }
    };
    window.addEventListener('popstate', onPopState);

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        unsubscribeState();
        unsubscribeAttention();
        unsubscribeLayout();
        clearInterval(tick);
        window.removeEventListener('pointerdown', onPointer, listenerOptions);
        window.removeEventListener('wheel', onPointer, listenerOptions);
        window.removeEventListener('touchmove', onPointer, listenerOptions);
        window.removeEventListener('keydown', onKeyDown, listenerOptions);
        window.removeEventListener('popstate', onPopState);
        end();
      }),
    );
    return [];
  }),
);
