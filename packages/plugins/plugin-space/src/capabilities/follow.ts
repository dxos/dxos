//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Option from 'effect/Option';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Obj } from '@dxos/echo';
import { type EID } from '@dxos/keys';
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

    const isFollowing = () => registry.get(ephemeralAtom).following !== undefined;

    const stop = () => registry.update(ephemeralAtom, (state) => ({ ...state, following: undefined }));

    const setPaused = (paused: boolean) =>
      registry.update(ephemeralAtom, (state) =>
        state.following && !!state.following.paused !== paused
          ? { ...state, following: { ...state.following, paused } }
          : state,
      );

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

      Effect.runFork(
        invoke(locator.reveal, { subject: path, anchor, follow: true }).pipe(
          Effect.catch((err) => Effect.sync(() => log.warn('follow reveal failed', { err }))),
        ),
      );
      return true;
    };

    // Opens what the leader shows unless this deck shows it already; an attended object this session cannot load
    // pauses the follow.
    const navigate = (spaceId: string, target: Shown) =>
      Effect.gen(function* () {
        const space = client.spaces.get().find((space) => space.id === spaceId);
        const object = space
          ? yield* Effect.tryPromise(() => space.db.makeRef(target.key).load()).pipe(
              Effect.catch(() => Effect.succeed(undefined)),
            )
          : undefined;
        if (!Obj.isObject(object)) {
          setPaused(true);
          return;
        }

        setPaused(false);
        const layout = registry.get(layoutAtom);
        if (target.planks) {
          const workspace = GraphPath.getSpacePath(spaceId);
          if (layout.workspace !== workspace) {
            yield* invoke(LayoutOperation.SwitchWorkspace, { subject: workspace });
          }
          if (!isSamePlanks(registry.get(layoutAtom).active, target.planks)) {
            yield* invoke(LayoutOperation.Set, { subject: [...target.planks] });
          }
        } else {
          // A flat deck shows its front plank; without the leader's path, any path to the object will do.
          const path = target.path ?? GraphPath.getObjectPathFromObject(object);
          const shownPath = target.path ?? findOpenPath(target.key);
          if (!shownPath || layout.front !== shownPath) {
            yield* invoke(LayoutOperation.Open, { subject: [path] });
          }
        }
      }).pipe(
        Effect.catch((err) =>
          Effect.sync(() => {
            log.warn('follow could not open what the leader shows', { err });
            setPaused(true);
          }),
        ),
      );

    const update = () => {
      const { following, viewersByObject, peerDecks } = registry.get(ephemeralAtom);
      if (!following) {
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
      if (!shown || focus.key !== shown.key || path !== shown.path || !isSamePlanks(planks, shown.planks)) {
        shown = { key: focus.key, path, planks, anchors: new Map(), revealUntil: now + MOUNT_TIMEOUT };
        if (navigating) {
          Effect.runFork(Fiber.interrupt(navigating));
        }
        navigating = Effect.runFork(navigate(following.spaceId, shown));
      }

      // Planks opened for the leader mount late, so their scroll and anchors are sent again until they have.
      const mounting = now < shown.revealUntil;
      const front = planks && deck?.front;
      if (front && layout.active.includes(front) && (front !== shown.front || (mounting && layout.front !== front))) {
        shown.front = front;
        Effect.runFork(
          invoke(LayoutOperation.ScrollIntoView, { subject: front, focus: false }).pipe(
            Effect.catch((err) => Effect.sync(() => log.warn('follow scroll failed', { err }))),
          ),
        );
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
        if (navigating) {
          yield* Fiber.interrupt(navigating);
        }
      }),
    );
    return [];
  }),
);
