//
// Copyright 2026 DXOS.org
//

import type * as Atom from 'effect/reactivity/Atom';
import type * as Registry from 'effect/reactivity/AtomRegistry';

import { type Event } from '@dxos/async';
import { log } from '@dxos/log';

import type * as CallsCapabilities from '../types/CallsCapabilities.ts';
import { type CallState } from './call-swarm-synchronizer.ts';
import { type MediaState } from './media-manager.ts';

/** The parts of `CallManager` the dispatcher observes. */
export type CallEventSource = {
  readonly joinedAtom: Atom.Atom<boolean>;
  readonly roomIdAtom: Atom.Atom<string | undefined>;
  readonly callStateUpdated: Event<CallState>;
  readonly mediaStateUpdated: Event<[MediaState, boolean]>;
};

export type BindCallEventsOptions = {
  registry: Registry.AtomRegistry;
  source: CallEventSource;
  /** Live list of contributed `CallsCapabilities.EventHandler`s. */
  handlers: Atom.Atom<CallsCapabilities.CallProperties[]>;
};

/**
 * Forwards a call's lifecycle and state to every contributed {@link CallsCapabilities.CallProperties} handler.
 *
 * Join and leave are serialized, and every state update waits for the pending one, because a
 * handler sets up per-call state in `onJoin` (e.g. the meeting's transcription manager) that its
 * update callbacks read. A handler contributed while a call is already joined is sent `onJoin` on
 * arrival, since the module that provides it may activate after the user joined.
 *
 * @returns A function that stops forwarding.
 */
export const bindCallEvents = ({ registry, source, handlers }: BindCallEventsOptions): (() => void) => {
  let lifecycle: Promise<void> = Promise.resolve();
  let active = false;
  let joinedRoomId: string | undefined;
  let joinedHandlers = new Set<CallsCapabilities.CallProperties>();

  const run = (step: string, fn: () => Promise<void>): Promise<void> =>
    fn().catch((err) => log.warn('call event handler failed', { step, err }));

  const enqueue = (step: string, fn: () => Promise<void>): void => {
    lifecycle = lifecycle.then(() => run(step, fn));
  };

  // Guarded because the first read of the handlers atom can notify its subscriber re-entrantly.
  const join = (handler: CallsCapabilities.CallProperties): void => {
    if (joinedHandlers.has(handler)) {
      return;
    }
    joinedHandlers.add(handler);
    const roomId = joinedRoomId;
    enqueue('onJoin', () => handler.onJoin({ roomId }));
  };

  const syncJoined = (joined: boolean): void => {
    if (joined && !active) {
      active = true;
      joinedRoomId = registry.get(source.roomIdAtom);
      registry.get(handlers).forEach(join);
    } else if (!joined && active) {
      const roomId = joinedRoomId;
      const left = [...joinedHandlers];
      active = false;
      joinedRoomId = undefined;
      joinedHandlers = new Set();
      left.forEach((handler) => enqueue('onLeave', () => handler.onLeave(roomId)));
    }
  };

  const broadcast = (step: string, fn: (handler: CallsCapabilities.CallProperties) => Promise<void>): void => {
    const pending = lifecycle;
    void pending.then(() => Promise.all(registry.get(handlers).map((handler) => run(step, () => fn(handler)))));
  };

  const unsubscribeJoined = registry.subscribe(source.joinedAtom, syncJoined, { immediate: true });
  const unsubscribeHandlers = registry.subscribe(handlers, (current) => {
    if (active) {
      current.forEach(join);
    }
  });
  const unsubscribeCallState = source.callStateUpdated.on((state) =>
    broadcast('onCallStateUpdated', (handler) => handler.onCallStateUpdated(state)),
  );
  const unsubscribeMediaState = source.mediaStateUpdated.on((update) =>
    broadcast('onMediaStateUpdated', (handler) => handler.onMediaStateUpdated(update)),
  );

  return () => {
    unsubscribeJoined();
    unsubscribeHandlers();
    unsubscribeCallState();
    unsubscribeMediaState();
  };
};
