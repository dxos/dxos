//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';

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

import { SpaceCapabilities } from '#types';

import { FOLLOW_LOST_TIMEOUT, getPeerFocus, getPresenceKeyFromPath } from '../util/presence.ts';

/** How long the view of an object opened for the leader has to mount; their anchor is revealed on every tick meanwhile. */
const MOUNT_TIMEOUT = 5_000;

const TICK_INTERVAL = 500;

/** Keys that do nothing on their own, so pressing one does not break a follow. */
const MODIFIER_KEYS: ReadonlySet<string> = new Set(['Alt', 'Control', 'Meta', 'Shift']);

/** What this session shows of the leader: their object, its type once loaded, and the anchor revealed in it. */
type Shown = {
  key: EID.EID;
  typename?: string;
  anchor?: string;
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

/**
 * Follows the peer named by the ephemeral `following` state: opens the object they attend when it changes and reveals
 * their anchor in it through the type's `Locator`, without moving the caret or focus. The local user's own input in an
 * object, Escape, attending another object, or the leader leaving the space ends it.
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

    let shown: Shown | undefined;
    let lostSince: number | undefined;
    let opening: Fiber.Fiber<void> | undefined;

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

    // The plank is looked up each time, since the layout can list a plank opened for the leader after `Open` returns.
    const reveal = () => {
      const locator = shown?.typename && registry.get(locatorsAtom).find(({ id }) => id === shown?.typename);
      const path = shown && findOpenPath(shown.key);
      if (!path || !shown?.anchor || !locator) {
        return;
      }

      Effect.runFork(
        invoke(locator.reveal, { subject: path, anchor: shown.anchor, follow: true }).pipe(
          Effect.catch((err) => Effect.sync(() => log.warn('follow reveal failed', { err }))),
        ),
      );
    };

    // Opens the leader's object unless this deck has it open already; one this session cannot load pauses the follow.
    const open = (spaceId: string, target: Shown) =>
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
        target.typename = Obj.getTypename(object);
        if (!findOpenPath(target.key)) {
          yield* invoke(LayoutOperation.Open, { subject: [GraphPath.getObjectPathFromObject(object)] });
        }
        reveal();
      }).pipe(
        Effect.catch((err) =>
          Effect.sync(() => {
            log.warn('follow could not open the leader object', { err });
            setPaused(true);
          }),
        ),
      );

    const update = () => {
      const { following, viewersByObject } = registry.get(ephemeralAtom);
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
      const anchor = focus.location?.viewport ?? focus.location?.selection;
      if (focus.key !== shown?.key) {
        shown = { key: focus.key, anchor, revealUntil: now + MOUNT_TIMEOUT };
        if (opening) {
          Effect.runFork(Fiber.interrupt(opening));
        }
        opening = Effect.runFork(open(following.spaceId, shown));
      } else if (anchor !== shown.anchor || now < shown.revealUntil) {
        shown.anchor = anchor;
        reveal();
      }
    };

    const unsubscribeState = registry.subscribe(ephemeralAtom, update);
    const tick = setInterval(update, TICK_INTERVAL);

    // Attending another object, or one in another space, is navigating away from the leader.
    const unsubscribeAttention = attention.subscribeCurrent(() => {
      if (!isFollowing() || !shown) {
        return;
      }
      const keys = attention.getCurrent().flatMap((path) => getPresenceKeyFromPath(path) ?? []);
      if (keys.length > 0 && !keys.includes(shown.key)) {
        stop();
      }
    });

    const onPointer = (event: Event) => {
      if (isFollowing() && isInObject(event.target)) {
        stop();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (isFollowing() && !MODIFIER_KEYS.has(event.key) && (event.key === 'Escape' || isInObject(event.target))) {
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
        clearInterval(tick);
        window.removeEventListener('pointerdown', onPointer, listenerOptions);
        window.removeEventListener('wheel', onPointer, listenerOptions);
        window.removeEventListener('touchmove', onPointer, listenerOptions);
        window.removeEventListener('keydown', onKeyDown, listenerOptions);
        if (opening) {
          yield* Fiber.interrupt(opening);
        }
      }),
    );
    return [];
  }),
);
