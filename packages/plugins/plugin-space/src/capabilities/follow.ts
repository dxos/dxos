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
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Obj } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { log } from '@dxos/log';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { Attention } from '@dxos/react-ui-attention/types';

import { SpaceCapabilities } from '#types';

import { FOLLOW_KEEP_SELECTOR, FOLLOW_LOST_TIMEOUT, getPeerFocus, getPresenceKeyFromPath } from '../util/presence.ts';

/** How often the follow updates, which also advances each extension's view. */
const TICK_INTERVAL = 500;

/** Keys that do nothing on their own, so pressing one does not break a follow. */
const MODIFIER_KEYS: ReadonlySet<string> = new Set(['Alt', 'Control', 'Meta', 'Shift']);

/** An object a follow has loaded: the path this session opens it at, and its type, which picks its `Locator`. */
type Loaded = { path: string; typename?: string };

/** The follow running here, until its scope closes. */
type Session = {
  scope: Scope.Closeable;
  /** What the follower shows of the leader, without any extension's value. */
  view: AppCapabilities.FollowView;
  /** The view handed to each extension that follows, with that extension's value, by extension id. */
  views: Map<string, Atom.Writable<AppCapabilities.FollowView>>;
  /** Whether each extension that follows shows the view, by extension id. */
  showing: Map<string, boolean>;
  /** The attended object as last opened here when no extension opens it, and whether that open failed. */
  opened?: string;
  openFailed?: boolean;
  /** When each plank appeared in the layout, the anchor its view last confirmed revealing, and the one being revealed. */
  mounted: Map<string, number>;
  revealed: Map<string, string>;
  revealing: Map<string, string>;
  fibers: Set<Fiber.Fiber<unknown>>;
  unsubscribes: (() => void)[];
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

/** Whether an event lands in a presence control, such as the viewers list a follower opens to stop. */
const isPresenceControl = (target: EventTarget | null): boolean =>
  target instanceof Element && !!target.closest(FOLLOW_KEEP_SELECTOR);

/** Whether an event lands in the deck's main area, which holds and scrolls the planks, or in an object's companion. */
const isInDeck = (target: EventTarget | null): boolean =>
  (target instanceof Element && !!target.closest('main')) || isInObject(target);

/**
 * Follows the peer named by the ephemeral `following` state. The follower loads the object the leader attends, reveals
 * the leader's anchor in each object it shows of them through the type's `Locator`, and hands each `LocatorExtension`
 * the leader's view with the leader's value for it. An extension that navigates opens what the leader shows; with none,
 * the follower opens the attended object itself. The local user's own input in the deck or an object's companion
 * (outside the presence controls), * selecting an object in the navtree, Escape, attending an object outside what is shown of the leader, leaving the
 * space's workspace, or the leader leaving the space ends it.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;
    const { invoke } = yield* Capabilities.OperationInvoker;
    const registry = yield* Capabilities.AtomRegistry;
    const layoutAtom = yield* AppCapabilities.Layout;
    const attention = yield* AttentionCapabilities.Attention;
    const ephemeralAtom = yield* SpaceCapabilities.EphemeralState;
    const client = yield* ClientCapabilities.Client;
    const extensionsAtom = capabilities.atom(AppCapabilities.LocatorExtension);
    const locatorsAtom = capabilities.atom(AppCapabilities.Locator);

    let session: Session | undefined;
    let lostSince: number | undefined;
    // The objects this session has loaded for the leader, and the loads in flight.
    const loaded = new Map<EID.EID, Loaded>();
    const loading = new Map<EID.EID, Fiber.Fiber<void>>();

    const isFollowing = () => registry.get(ephemeralAtom).following !== undefined;

    const stop = () => registry.update(ephemeralAtom, (state) => ({ ...state, following: undefined }));

    const setPaused = (paused: boolean) =>
      registry.update(ephemeralAtom, (state) =>
        state.following && !!state.following.paused !== paused
          ? { ...state, following: { ...state.following, paused } }
          : state,
      );

    // Paused while the attended object cannot be loaded or opened, or while an extension cannot show the view.
    const refreshPaused = () => {
      if (session) {
        setPaused(
          !session.view.attended.localPath || !!session.openFailed || [...session.showing.values()].includes(false),
        );
      }
    };

    const fork = (effect: Effect.Effect<unknown>) => {
      const fiber = Effect.runFork(effect);
      session?.fibers.add(fiber);
      fiber.addObserver(() => session?.fibers.delete(fiber));
    };

    const end = () => {
      if (session) {
        session.unsubscribes.forEach((unsubscribe) => unsubscribe());
        for (const fiber of session.fibers) {
          Effect.runFork(Fiber.interrupt(fiber));
        }
        Effect.runFork(Scope.close(session.scope, Exit.void));
        session = undefined;
      }
      // A load still in flight would otherwise land after the follow ended.
      for (const fiber of loading.values()) {
        Effect.runFork(Fiber.interrupt(fiber));
      }
      loading.clear();
      loaded.clear();
      lostSince = undefined;
    };

    // Loads an object the leader shows, for the path this session opens it at and its type. One this session cannot load
    // yet (one the leader just made may not have replicated) is loaded again on the next update.
    const load = (spaceId: string, key: EID.EID) => {
      const space = client.spaces.get().find((space) => space.id === spaceId);
      if (!loaded.has(key) && space && !loading.has(key)) {
        const fiber = Effect.runFork(
          Effect.tryPromise(() => space.db.makeRef(key).load()).pipe(
            Effect.map((object) => {
              if (Obj.isObject(object)) {
                loaded.set(key, { path: GraphPath.getObjectPathFromObject(object), typename: Obj.getTypename(object) });
              }
            }),
            Effect.catch(() => Effect.void),
            Effect.ensuring(Effect.sync(() => loading.delete(key))),
          ),
        );
        loading.set(key, fiber);
        fiber.addObserver(() => {
          if (loaded.has(key)) {
            update();
          }
        });
      }
      return loaded.get(key);
    };

    // The path this session opens the attended object at: its own once loaded, or the space's Home for a leader on it,
    // whose key names no object.
    const getLocalPath = (spaceId: string, key: EID.EID) =>
      EID.getEntityId(key) ? load(spaceId, key)?.path : GraphPath.getSpaceHomePath(spaceId);

    const startExtension = (
      current: Session,
      extension: AppCapabilities.LocatorExtension,
      view: AppCapabilities.FollowView,
    ) => {
      if (!extension.follow) {
        return;
      }
      const viewAtom = Atom.make(view);
      current.views.set(extension.id, viewAtom);
      const showing = Effect.runSync(extension.follow(viewAtom).pipe(Scope.provide(current.scope)));
      current.unsubscribes.push(
        registry.subscribe(
          showing,
          (shows) => {
            current.showing.set(extension.id, shows);
            refreshPaused();
          },
          { immediate: true },
        ),
      );
    };

    // With no extension that navigates, the follower opens the attended object at its own path, in the space's workspace.
    const open = (current: Session) => {
      const { spaceId, attended } = current.view;
      const { localPath } = attended;
      const target = localPath && `${attended.key}\n${localPath}`;
      if (!localPath || (target === current.opened && !current.openFailed)) {
        return;
      }
      current.opened = target;
      current.openFailed = false;
      // One operation carries the workspace, so switching to the space and opening do not race.
      fork(
        invoke(LayoutOperation.Open, {
          subject: [localPath],
          workspace: GraphPath.getSpacePath(spaceId),
          focus: false,
        }).pipe(
          Effect.catchCause((cause) =>
            Effect.sync(() => {
              log.warn('follow could not open what the leader attends', { cause });
              current.openFailed = true;
              refreshPaused();
            }),
          ),
        ),
      );
    };

    // Reveals the leader's anchor in each object this session shows of them, at the path its layout holds it at. A plank
    // just opened may not have mounted, so its anchor is revealed again on every update until it has had time to.
    const revealAnchors = (current: Session, anchors: ReadonlyMap<EID.EID, string>) => {
      const { now } = current.view;
      const { active } = registry.get(layoutAtom);
      for (const path of current.mounted.keys()) {
        if (!active.includes(path)) {
          current.mounted.delete(path);
          current.revealed.delete(path);
        }
      }
      for (const path of active) {
        if (!current.mounted.has(path)) {
          current.mounted.set(path, now);
        }
      }

      for (const [key, anchor] of anchors) {
        const leaderPath = current.view.active.find((plank) => getPresenceKeyFromPath(plank) === key);
        const path =
          leaderPath && active.includes(leaderPath)
            ? leaderPath
            : active.find((plank) => getPresenceKeyFromPath(plank) === key);
        const typename = load(current.view.spaceId, key)?.typename;
        const locator = typename && registry.get(locatorsAtom).find(({ id }) => id === typename);
        const mounting =
          path !== undefined && now < (current.mounted.get(path) ?? 0) + AppCapabilities.FOLLOW_MOUNT_TIMEOUT;
        if (
          !path ||
          !locator ||
          current.revealing.get(path) === anchor ||
          (anchor === current.revealed.get(path) && !mounting)
        ) {
          continue;
        }
        // Only an anchor its view confirms is settled; one it could not reveal yet (unmounted, or not loaded) is asked
        // again on the next update.
        current.revealing.set(path, anchor);
        fork(
          invoke(locator.reveal, { subject: path, anchor, follow: true }).pipe(
            Effect.tap((done) => Effect.sync(() => done && current.revealed.set(path, anchor))),
            Effect.catch((err) => Effect.sync(() => log.warn('follow reveal failed', { err }))),
            Effect.ensuring(
              Effect.sync(() => current.revealing.get(path) === anchor && current.revealing.delete(path)),
            ),
          ),
        );
      }
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
      const deck = peerDecks[following.spaceId]?.[following.identityKey]?.[focus.sessionId];
      const active = deck?.planks ?? [];
      const getAnchor = (key: EID.EID) => {
        const location =
          key === focus.key
            ? focus.location
            : viewersByObject[key]?.[following.identityKey]?.[focus.sessionId]?.location;
        return location?.viewport ?? location?.selection;
      };
      // The space's Home names no object, so it has no anchor.
      const anchors = new Map<EID.EID, string>();
      for (const key of new Set([...active.flatMap((plank) => getPresenceKeyFromPath(plank) ?? []), focus.key])) {
        const anchor = EID.getEntityId(key) && getAnchor(key);
        if (anchor) {
          anchors.set(key, anchor);
        }
      }
      const path = active.find((plank) => getPresenceKeyFromPath(plank) === focus.key);
      const localPath = getLocalPath(following.spaceId, focus.key);
      const view: AppCapabilities.FollowView = {
        now,
        spaceId: following.spaceId,
        active,
        attended: { key: focus.key, ...(path && { path }), ...(localPath && { localPath }) },
      };

      session ??= {
        scope: Effect.runSync(Scope.make()),
        view,
        views: new Map(),
        showing: new Map(),
        mounted: new Map(),
        revealed: new Map(),
        revealing: new Map(),
        fibers: new Set(),
        unsubscribes: [],
      };
      const current = session;
      current.view = view;

      // Each extension gets the leader's value for it alone; one contributed after the follow started joins it.
      const extensions = registry.get(extensionsAtom);
      for (const extension of extensions) {
        const value = deck?.extensions?.[extension.id];
        const extensionView = { ...view, ...(value !== undefined && { value }) };
        const viewAtom = current.views.get(extension.id);
        if (!viewAtom) {
          startExtension(current, extension, extensionView);
        } else {
          registry.set(viewAtom, extensionView);
        }
      }

      if (!extensions.some((extension) => extension.navigates && extension.follow)) {
        open(current);
      }
      revealAnchors(current, anchors);
      refreshPaused();
    };

    const unsubscribeState = registry.subscribe(ephemeralAtom, update);
    const tick = setInterval(update, TICK_INTERVAL);

    // Attending an object outside what is shown of the leader, or one in another space, is navigating away from them.
    const unsubscribeAttention = attention.subscribeCurrent(() => {
      if (!isFollowing() || !session) {
        return;
      }
      const { active, attended } = session.view;
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
      if (
        isFollowing() &&
        !isPresenceControl(event.target) &&
        (isInDeck(event.target) || isTreeNavigation(event.target))
      ) {
        stop();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        isFollowing() &&
        !MODIFIER_KEYS.has(event.key) &&
        !isPresenceControl(event.target) &&
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
