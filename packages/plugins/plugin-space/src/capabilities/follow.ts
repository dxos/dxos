//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Option from 'effect/Option';

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
import { Attention } from '@dxos/react-ui-attention/types';

import { SpaceCapabilities, type SpaceSchema } from '#types';

import { FOLLOW_LOST_TIMEOUT, getPeerFocus, getPresenceKeyFromPath } from '../util/presence.ts';

/** How long planks opened for the leader have to mount; their scroll and anchors are sent again on every tick meanwhile. */
const MOUNT_TIMEOUT = 5_000;

const TICK_INTERVAL = 500;

/** Keys that do nothing on their own, so pressing one does not break a follow. */
const MODIFIER_KEYS: ReadonlySet<string> = new Set(['Alt', 'Control', 'Meta', 'Shift']);

/**
 * What this session shows of the leader: their attended object, the deck mirrored from theirs (when this one lays
 * planks side by side), its front plank, and the anchor last revealed in each plank.
 */
type Shown = {
  key: EID.EID;
  path?: string;
  planks?: readonly string[];
  front?: string;
  anchors: Map<string, string>;
  revealUntil: number;
  /** Set when navigating to it paused the follow, so the next update navigates again. */
  retry?: boolean;
  /** The leader's companions as last mirrored, so an unchanged report opens nothing again. */
  companions?: string;
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

const isSamePlanks = (a?: readonly string[], b?: readonly string[]) =>
  a === b || (a?.length === b?.length && !!a?.every((path, index) => path === b?.[index]));

/**
 * Follows the peer named by the ephemeral `following` state. A deck that lays planks side by side mirrors the leader's
 * deck: its planks, the plank it is scrolled to, and the anchor in each plank. A flat deck opens the plank the leader
 * attends, at the leader's path. Anchors are revealed through each type's `Locator` without moving the caret or focus.
 * The local user's own input in the deck or an object's companion, selecting an object in the navtree, Escape, attending an
 * object outside the leader's deck, leaving the space's workspace, or the leader leaving the space ends it.
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
    const locatorsAtom = capabilities.atom(AppCapabilities.Locator);
    const appGraphAtom = capabilities.atom(AppCapabilities.AppGraph);

    let shown: Shown | undefined;
    let lostSince: number | undefined;
    let navigating: Fiber.Fiber<void> | undefined;
    // Reveals still running when a follow stops would otherwise scroll the follower's view afterwards.
    const revealing = new Set<Fiber.Fiber<void>>();

    const isFollowing = () => registry.get(ephemeralAtom).following !== undefined;

    const stop = () => registry.update(ephemeralAtom, (state) => ({ ...state, following: undefined }));

    const setPaused = (paused: boolean) =>
      registry.update(ephemeralAtom, (state) =>
        state.following && !!state.following.paused !== paused
          ? { ...state, following: { ...state.following, paused } }
          : state,
      );

    // Whether this deck has a URL binding for a graph path; the deck drops a path it cannot represent.
    const isBound = (path: string) => {
      const [builder] = registry.get(appGraphAtom);
      return !!builder && Option.isSome(PathResolution.representNode(builder, path));
    };

    const findOpenPath = (key: EID.EID) =>
      registry.get(layoutAtom).active.find((path) => getPresenceKeyFromPath(path) === key);

    // The type is read off this deck's graph node, which a plank opened for the leader may not have until it mounts.
    const reveal = (path: string, anchor: string) => {
      const [appGraph] = registry.get(appGraphAtom);
      const node = appGraph && Option.getOrUndefined(registry.get(appGraph.graph.node(path)));
      const typename = node && Obj.isObject(node.data) ? Obj.getTypename(node.data) : undefined;
      const locator = typename && registry.get(locatorsAtom).find(({ id }) => id === typename);
      if (!locator) {
        return false;
      }

      const fiber = Effect.runFork(
        invoke(locator.reveal, { subject: path, anchor, follow: true }).pipe(
          Effect.catch((err) => Effect.sync(() => log.warn('follow reveal failed', { err }))),
        ),
      );
      revealing.add(fiber);
      fiber.addObserver(() => revealing.delete(fiber));
      return true;
    };

    const pauseFor = (target: Shown, err: unknown) =>
      Effect.sync(() => {
        log.warn('follow could not open what the leader shows', { err });
        target.retry = true;
        setPaused(true);
      });

    // Opens what the leader shows unless this deck shows it already; an attended object this session cannot load
    // pauses the follow. A leader on the space's Home attends the space itself, whose key names no object.
    const navigate = (spaceId: string, target: Shown) =>
      Effect.gen(function* () {
        const space = client.spaces.get().find((space) => space.id === spaceId);
        const isHome = !EID.getEntityId(target.key);
        const object =
          space && !isHome
            ? yield* Effect.tryPromise(() => space.db.makeRef(target.key).load()).pipe(
                Effect.catch(() => Effect.succeed(undefined)),
              )
            : undefined;
        if (!space || (!isHome && !Obj.isObject(object))) {
          target.retry = true;
          setPaused(true);
          return;
        }

        const layout = registry.get(layoutAtom);
        if (target.planks) {
          const workspace = GraphPath.getSpacePath(spaceId);
          if (layout.workspace !== workspace) {
            yield* invoke(LayoutOperation.SwitchWorkspace, { subject: workspace });
          }
          // The deck leaves out a plank it cannot bind, so a deck short only of those already shows the leader's.
          if (!isSamePlanks(registry.get(layoutAtom).active, target.planks.filter(isBound))) {
            yield* invoke(LayoutOperation.Set, { subject: [...target.planks], focus: false });
          }
        } else {
          // A flat deck shows its front plank, at the leader's path where this deck has a URL binding for it, since the
          // deck drops a path it cannot represent; otherwise any path to the object will do, its own one when opening.
          const leaderPath = target.path && isBound(target.path) ? target.path : undefined;
          const path =
            leaderPath ??
            (Obj.isObject(object) ? GraphPath.getObjectPathFromObject(object) : GraphPath.getSpaceHomePath(spaceId));
          const shownPath = leaderPath ?? findOpenPath(target.key);
          if (!shownPath || layout.front !== shownPath) {
            // A flat deck shows its last plank, and Open leaves a plank it already holds where it is, so the
            // planks stacked after the leader's object come off first, as a breadcrumb would.
            const index = layout.active.findIndex((plank) => getPresenceKeyFromPath(plank) === target.key);
            if (index >= 0 && index < layout.active.length - 1) {
              yield* invoke(LayoutOperation.Set, { subject: layout.active.slice(0, index + 1), focus: false });
            }
            yield* invoke(LayoutOperation.Open, { subject: [path], focus: false });
          }
        }

        // Unpausing only once the deck has the leader's view keeps a failing retry from re-entering `update` at
        // once, and the planks it opened mount from now, however long the pause was.
        target.revealUntil = Date.now() + MOUNT_TIMEOUT;
        setPaused(false);
      }).pipe(
        // A failed operation can reach here as a defect; an interrupt is a newer target or a stop, not a failure.
        Effect.catch((err) => pauseFor(target, err)),
        Effect.catchDefect((err) => pauseFor(target, err)),
      );

    const update = () => {
      const { following, viewersByObject, peerDecks } = registry.get(ephemeralAtom);
      if (!following) {
        // A navigation still loading what the leader showed would otherwise land after the follow ended.
        if (navigating) {
          Effect.runFork(Fiber.interrupt(navigating));
          navigating = undefined;
        }
        for (const fiber of revealing) {
          Effect.runFork(Fiber.interrupt(fiber));
        }
        revealing.clear();
        shown = undefined;
        lostSince = undefined;
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
      const layout = registry.get(layoutAtom);
      const deck = peerDecks[following.spaceId]?.[following.identityKey]?.[focus.sessionId];
      // A leader that sent no deck is followed as a flat deck follows, by the object they attend.
      const planks = !layout.flat && deck && deck.planks.length > 0 ? deck.planks : undefined;
      const path = deck?.planks.find((plank) => getPresenceKeyFromPath(plank) === focus.key);
      // A pause keeps what is shown and only navigates again: an object the leader just made may not have replicated.
      const changed = !shown || focus.key !== shown.key || path !== shown.path || !isSamePlanks(planks, shown.planks);
      if (!shown || changed) {
        shown = { key: focus.key, path, planks, anchors: new Map(), revealUntil: now + MOUNT_TIMEOUT };
      }
      if (changed || shown.retry) {
        shown.retry = false;
        if (navigating) {
          Effect.runFork(Fiber.interrupt(navigating));
        }
        navigating = Effect.runFork(navigate(following.spaceId, shown));
      }

      // Planks opened for the leader mount late, so their scroll and anchors are sent again until they have.
      const mounting = now < shown.revealUntil;
      // The leader's front when this deck holds it. A front this deck has no binding for is never held, so once the deck
      // holds every plank of theirs it can bind, it slides to one of theirs it holds, the first after the front, else
      // the last before it; until then the deck still shows its own planks and does not slide.
      const frontIndex = planks && deck?.front ? planks.indexOf(deck.front) : -1;
      const holdsLeaderDeck = !!planks?.every((plank) => layout.active.includes(plank) || !isBound(plank));
      const front =
        planks && frontIndex >= 0
          ? (holdsLeaderDeck
              ? [...planks.slice(frontIndex), ...planks.slice(0, frontIndex).reverse()]
              : [planks[frontIndex]]
            ).find((plank) => layout.active.includes(plank))
          : undefined;
      if (front && (front !== shown.front || (mounting && layout.front !== front))) {
        shown.front = front;
        Effect.runFork(
          invoke(LayoutOperation.ScrollIntoView, { subject: front, focus: false }).pipe(
            Effect.catch((err) => Effect.sync(() => log.warn('follow scroll failed', { err }))),
          ),
        );
      }

      // Companions are content: each plank shown of the leader opens the companion they have open there, in their tab,
      // and closes one they closed. A flat deck holds the leader's plank at its own path for the same object.
      if (deck?.companions) {
        const leaderCompanions = new Set(deck.companions);
        const variant = deck.companionVariant;
        const pairs: [string, string | undefined][] = planks
          ? planks.map((plank) => [plank, plank])
          : path
            ? [[path, findOpenPath(focus.key)]]
            : [];
        const signature = JSON.stringify([pairs.map(([leaderPlank]) => leaderCompanions.has(leaderPlank)), variant]);
        if (signature !== shown.companions || mounting) {
          shown.companions = signature;
          for (const [leaderPlank, plank] of pairs) {
            if (!plank || !layout.active.includes(plank)) {
              continue;
            }
            const open = layout.companions?.items.includes(plank) ?? false;
            const subject = leaderCompanions.has(leaderPlank)
              ? variant && (!open || layout.companions?.variant !== variant)
                ? `${plank}/~${variant}`
                : undefined
              : open
                ? null
                : undefined;
            if (subject !== undefined) {
              Effect.runFork(
                invoke(LayoutOperation.UpdateCompanion, { subject, anchor: plank }).pipe(
                  Effect.catch((err) => Effect.sync(() => log.warn('follow companion failed', { err }))),
                ),
              );
            }
          }
        }
      }

      const targets: [string | undefined, SpaceSchema.PeerLocation | undefined][] = planks
        ? planks.map((plank) => {
            const key = getPresenceKeyFromPath(plank);
            return [plank, key && viewersByObject[key]?.[following.identityKey]?.[focus.sessionId]?.location];
          })
        : [[findOpenPath(focus.key), focus.location]];
      for (const [plank, location] of targets) {
        const anchor = location?.viewport ?? location?.selection;
        if (plank && anchor && layout.active.includes(plank) && (anchor !== shown.anchors.get(plank) || mounting)) {
          if (reveal(plank, anchor)) {
            shown.anchors.set(plank, anchor);
          }
        }
      }
    };

    const unsubscribeState = registry.subscribe(ephemeralAtom, update);
    const tick = setInterval(update, TICK_INTERVAL);

    // Attending an object outside what is shown of the leader, or one in another space, is navigating away from them.
    const unsubscribeAttention = attention.subscribeCurrent(() => {
      if (!isFollowing() || !shown) {
        return;
      }
      const keys = attention.getCurrent().flatMap((path) => getPresenceKeyFromPath(path) ?? []);
      const followed = shown.planks?.flatMap((path) => getPresenceKeyFromPath(path) ?? []) ?? [shown.key];
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
      Effect.gen(function* () {
        unsubscribeState();
        unsubscribeAttention();
        unsubscribeLayout();
        clearInterval(tick);
        window.removeEventListener('pointerdown', onPointer, listenerOptions);
        window.removeEventListener('wheel', onPointer, listenerOptions);
        window.removeEventListener('touchmove', onPointer, listenerOptions);
        window.removeEventListener('keydown', onKeyDown, listenerOptions);
        window.removeEventListener('popstate', onPopState);
        if (navigating) {
          yield* Fiber.interrupt(navigating);
        }
        yield* Fiber.interruptAll(revealing);
      }),
    );
    return [];
  }),
);
