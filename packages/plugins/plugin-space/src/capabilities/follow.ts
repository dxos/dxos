//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as PathResolution from '@dxos/app-graph/PathResolution';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Obj } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { log } from '@dxos/log';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { Attention, ViewLocation } from '@dxos/react-ui-attention/types';

import { SpaceCapabilities } from '#types';

import { FOLLOW_KEEP_SELECTOR, FOLLOW_LOST_TIMEOUT, getPeerFocus, getPresenceKeyFromPath } from '../util/presence.ts';

/** How often the follow updates, applying again what has not mounted yet. */
const TICK_INTERVAL = 500;

/** The context the layout's state in a space is kept under: the space's EID. */
const getSpaceKey = (spaceId: string) => GraphPath.getEidFromPath(GraphPath.getSpacePath(spaceId));

const isSamePlanks = (a?: readonly string[], b?: readonly string[]) =>
  a === b || (a?.length === b?.length && !!a?.every((path, index) => path === b?.[index]));

/** Keys that do nothing on their own, so pressing one does not break a follow. */
const MODIFIER_KEYS: ReadonlySet<string> = new Set(['Alt', 'Control', 'Meta', 'Shift']);

/** An object a follow has loaded: the path this session opens it at, and its type, which picks its `Locator`. */
type Loaded = { path: string; typename?: string };

/** What the leader shows in the space. */
type LeaderView = {
  now: number;
  spaceId: string;
  /** Their planks in the space, in order, and the one their deck is scrolled to. */
  active: readonly string[];
  front?: string;
  /**
   * The object they attend; the path they have it open at, when they reported one; and the path this session opens it
   * at itself, absent while it cannot load the object yet.
   */
  attended: { key: EID.EID; path?: string; localPath?: string };
};

/** What this session last landed of the leader's layout. */
type Shown = {
  key: EID.EID;
  path?: string;
  planks?: readonly string[];
  /** The leader's planks (or path, with no planks) this session could bind when it last landed them. */
  bound: readonly string[];
  front?: string;
  /** When it last landed them, from which the planks it opened have the mount window to mount. */
  landedAt: number;
  /** Set when it could not open them, so the next update opens them again. */
  retry?: boolean;
  /** The leader's companions as last mirrored, so an unchanged report opens nothing again. */
  companions?: string;
};

/** The follow running here, until its scope closes. */
type Session = {
  view: LeaderView;
  /** The leader's value last written here, by aspect key and context. */
  written: Map<string, string>;
  shown?: Shown;
  navigating?: Fiber.Fiber<void>;
  /** Whether landing the leader's layout last failed. */
  openFailed?: boolean;
  /** When each plank appeared in the layout, the anchor its view last confirmed revealing, and the one being revealed. */
  mounted: Map<string, number>;
  revealed: Map<string, string>;
  revealing: Map<string, string>;
  fibers: Set<Fiber.Fiber<unknown>>;
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
 * Follows the peer named by the ephemeral `following` state. The follower opens the leader's planks through the layout
 * (or, with none reported, the object they attend), scrolls to their front plank and opens their companions, reveals
 * the leader's anchor in each object it shows of them through the type's `Locator`, and writes the leader's values of
 * each followed view state aspect into its own. None of it moves the caret or focus. The local
 * user's own input in the deck or an object's companion (outside the presence controls), selecting an object in the
 * navtree, Escape, attending an object outside what is shown of the leader, leaving the space's workspace, or the
 * leader leaving the space ends it.
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
    const viewState = yield* AttentionCapabilities.ViewState;
    const locatorsAtom = capabilities.atom(AppCapabilities.Locator);
    const appGraphAtom = capabilities.atom(AppCapabilities.AppGraph);
    const decodeCompanions = Schema.decodeUnknownOption(Schema.toCodecJson(AppCapabilities.Companions.schema));

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

    // Paused while the attended object cannot be loaded, or the leader's layout cannot be opened here.
    const refreshPaused = () => {
      if (session) {
        setPaused(!session.view.attended.localPath || !!session.openFailed);
      }
    };

    const fork = <A>(effect: Effect.Effect<A>): Fiber.Fiber<A> => {
      const fiber = Effect.runFork(effect);
      session?.fibers.add(fiber);
      fiber.addObserver(() => session?.fibers.delete(fiber));
      return fiber;
    };

    const end = () => {
      if (session) {
        for (const fiber of session.fibers) {
          Effect.runFork(Fiber.interrupt(fiber));
        }
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

    // Writes each value of the leader's followed view state that changed since it was last written here.
    const writeViewState = (current: Session, values: Readonly<Record<string, Readonly<Record<string, unknown>>>>) => {
      for (const [key, byContext] of Object.entries(values)) {
        for (const [contextId, value] of Object.entries(byContext)) {
          const written = JSON.stringify(value);
          if (current.written.get(`${key}\n${contextId}`) !== written) {
            current.written.set(`${key}\n${contextId}`, written);
            viewState.setEncoded(key, contextId, value);
          }
        }
      }
    };

    // Whether this session's layout has a URL binding for a graph path; the layout drops a path it cannot represent.
    const isBound = (path: string) => {
      const [builder] = registry.get(appGraphAtom);
      return !!builder && Option.isSome(PathResolution.representNode(builder, path));
    };

    const findOpenPath = (key: EID.EID) =>
      registry.get(layoutAtom).active.find((path) => GraphPath.getEidFromPath(path) === key);

    const retryLater = (current: Session, target: Shown, err?: unknown) =>
      Effect.sync(() => {
        if (err !== undefined) {
          log.warn('follow could not open what the leader shows', { err });
        }
        target.retry = true;
        current.openFailed = true;
        refreshPaused();
      });

    // Opens the leader's planks, in one operation carrying the space's workspace so switching and opening do not race;
    // with no planks reported, the object they attend. It waits while that object is unavailable, as one the leader
    // just made may not have replicated.
    const navigate = (current: Session, target: Shown) =>
      Effect.gen(function* () {
        const { spaceId, attended } = current.view;
        if (!attended.localPath) {
          return yield* retryLater(current, target);
        }
        const workspace = GraphPath.getSpacePath(spaceId);
        const { active, workspace: shownWorkspace } = registry.get(layoutAtom);
        const inWorkspace = shownWorkspace === workspace;
        if (target.planks) {
          // The layout leaves out a plank it cannot bind, so one short only of those already shows the leader's.
          if (!inWorkspace || !isSamePlanks(active, target.planks.filter(isBound))) {
            yield* invoke(LayoutOperation.Set, { subject: [...target.planks], workspace, focus: false });
          }
        } else {
          // The attended object at the leader's path where this layout can bind it, else at its own path. One already
          // held comes forward by closing the planks after it, as a breadcrumb would.
          const leaderPath = target.path && isBound(target.path) ? target.path : undefined;
          const shownPath = leaderPath ?? findOpenPath(target.key) ?? attended.localPath;
          const index = inWorkspace ? active.indexOf(shownPath) : -1;
          if (index >= 0 && index < active.length - 1) {
            yield* invoke(LayoutOperation.Set, { subject: active.slice(0, index + 1), workspace, focus: false });
          } else if (index < 0) {
            yield* invoke(LayoutOperation.Open, { subject: [shownPath], workspace, focus: false });
          }
        }
        // The planks it opened mount from now, however long it waited.
        target.landedAt = current.view.now;
        current.openFailed = false;
        refreshPaused();
      }).pipe(
        // A failed operation can reach here as a defect; an interrupt is a newer view or a stop, not a failure.
        Effect.catch((err) => retryLater(current, target, err)),
        Effect.catchDefect((err) => retryLater(current, target, err)),
      );

    // Shows the leader's layout: their planks, the plank they are scrolled to, and the companions they have open.
    const showLayout = (current: Session, companions: unknown) => {
      const { now, spaceId, active: planksShown, front: leaderFront, attended } = current.view;
      const { key, path } = attended;
      const planks = planksShown.length > 0 ? planksShown : undefined;
      // A binding that arrives later (its plugin loads) lands the view again, so the layout gains the plank it left out.
      const bound = (planks ?? (path ? [path] : [])).filter(isBound);
      const shown = current.shown;
      const changed =
        !shown ||
        key !== shown.key ||
        path !== shown.path ||
        !isSamePlanks(planks, shown.planks) ||
        !isSamePlanks(bound, shown.bound);
      const target = !shown || changed ? { key, path, planks, bound, landedAt: now } : shown;
      current.shown = target;
      if (changed || target.retry) {
        target.retry = false;
        if (current.navigating) {
          Effect.runFork(Fiber.interrupt(current.navigating));
        }
        current.navigating = fork(navigate(current, target));
      }

      const { active } = registry.get(layoutAtom);
      const spaceKey = getSpaceKey(spaceId);
      // Planks opened for the leader mount late, so their scroll and companions are applied again until they have.
      const mounting = now < target.landedAt + AppCapabilities.FOLLOW_MOUNT_TIMEOUT;
      // The leader's front when this layout holds it. A front it has no binding for is never held, so once it holds
      // every plank of theirs it can bind, it slides to one of theirs it holds, the first after the front, else the last
      // before it; until then it shows its own planks and does not slide.
      const frontIndex = planks && leaderFront ? planks.indexOf(leaderFront) : -1;
      const holdsLeaderPlanks = !!planks?.every((plank) => active.includes(plank) || !isBound(plank));
      const front =
        planks && frontIndex >= 0
          ? (holdsLeaderPlanks
              ? [...planks.slice(frontIndex), ...planks.slice(0, frontIndex).reverse()]
              : [planks[frontIndex]]
            ).find((plank) => active.includes(plank))
          : undefined;
      const ownFront = spaceKey && viewState.get(ViewLocation.aspect, spaceKey).viewport;
      if (front && (front !== target.front || (mounting && ownFront !== front))) {
        target.front = front;
        fork(
          invoke(LayoutOperation.ScrollIntoView, { subject: front, focus: false }).pipe(
            Effect.catch((err) => Effect.sync(() => log.warn('follow scroll failed', { err }))),
          ),
        );
      }

      // Each plank shown of the leader opens the companion they have open there, in their tab, and closes one they
      // closed. With no planks reported, the attended object's plank is at this session's own path for it.
      const leader = Option.getOrUndefined(decodeCompanions(companions));
      if (!leader || !spaceKey) {
        return;
      }
      const own = viewState.get(AppCapabilities.Companions, spaceKey);
      const leaderPlanks = new Set(leader.planks);
      const pairs: [string, string | undefined][] = planks
        ? planks.map((plank) => [plank, plank])
        : path
          ? [[path, findOpenPath(key)]]
          : [];
      const signature = JSON.stringify([pairs.map(([leaderPlank]) => leaderPlanks.has(leaderPlank)), leader.variant]);
      if (signature === target.companions && !mounting) {
        return;
      }
      target.companions = signature;
      for (const [leaderPlank, plank] of pairs) {
        if (!plank || !active.includes(plank)) {
          continue;
        }
        const open = own.planks.includes(plank);
        const subject = leaderPlanks.has(leaderPlank)
          ? leader.variant && (!open || own.variant !== leader.variant)
            ? `${plank}/~${leader.variant}`
            : undefined
          : open
            ? null
            : undefined;
        if (subject !== undefined) {
          fork(
            invoke(LayoutOperation.UpdateCompanion, { subject, anchor: plank }).pipe(
              Effect.catch((err) => Effect.sync(() => log.warn('follow companion failed', { err }))),
            ),
          );
        }
      }
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
          invoke(locator.reveal, { subject: path, anchor, focus: false }).pipe(
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
      const view: LeaderView = {
        now,
        spaceId: following.spaceId,
        active,
        ...(deck?.front && { front: deck.front }),
        attended: { key: focus.key, ...(path && { path }), ...(localPath && { localPath }) },
      };

      session ??= {
        view,
        written: new Map(),
        mounted: new Map(),
        revealed: new Map(),
        revealing: new Map(),
        fibers: new Set(),
      };
      const current = session;
      current.view = view;

      const spaceKey = getSpaceKey(following.spaceId);
      showLayout(current, spaceKey && deck?.viewState?.[AppCapabilities.Companions.key]?.[spaceKey]);
      writeViewState(current, deck?.viewState ?? {});
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
