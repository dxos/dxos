//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';
import * as Registry from 'effect/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { Event, Trigger } from '@dxos/async';

import type * as CallsCapabilities from '../types/CallsCapabilities.ts';
import { bindCallEvents } from './call-events.ts';
import { type CallState } from './call-swarm-synchronizer.ts';
import { type MediaState } from './media-manager.ts';

const ROOM_ID = 'dxn:echo:@:room';

const MEDIA: MediaState = { pulledAudioTracks: {}, pulledVideoStreams: {} };

const setup = (initiallyJoined = false) => {
  const registry = Registry.make();
  const joinedAtom = Atom.make(initiallyJoined).pipe(Atom.keepAlive);
  const roomIdAtom = Atom.make<string | undefined>(ROOM_ID).pipe(Atom.keepAlive);
  const handlers = Atom.make<CallsCapabilities.CallProperties[]>([]).pipe(Atom.keepAlive);
  const source = {
    joinedAtom,
    roomIdAtom,
    callStateUpdated: new Event<CallState>(),
    mediaStateUpdated: new Event<[MediaState, boolean]>(),
  };
  const unbind = bindCallEvents({ registry, source, handlers });
  return { registry, joinedAtom, handlers, source, unbind };
};

/** Records every callback; `onJoin` blocks until released, like opening a transcription manager. */
const makeHandler = () => {
  const calls: string[] = [];
  const joinStarted = new Trigger();
  const releaseJoin = new Trigger();
  const settled = new Trigger();
  const handler: CallsCapabilities.CallProperties = {
    onJoin: async ({ roomId }) => {
      calls.push(`join:${roomId}`);
      joinStarted.wake();
      await releaseJoin.wait();
      calls.push('joined');
    },
    onLeave: async (roomId) => {
      calls.push(`leave:${roomId}`);
      settled.wake();
    },
    onCallStateUpdated: async () => {
      calls.push('call');
    },
    onMediaStateUpdated: async ([, speaking]) => {
      calls.push(`media:${speaking}`);
      settled.wake();
    },
  };
  return { handler, calls, joinStarted, releaseJoin, settled };
};

describe('bindCallEvents', () => {
  test('a join reaches the handlers, and updates wait for it to finish', async ({ expect }) => {
    const { registry, joinedAtom, handlers, source, unbind } = setup();
    const { handler, calls, joinStarted, releaseJoin, settled } = makeHandler();
    registry.set(handlers, [handler]);

    registry.set(joinedAtom, true);
    await joinStarted.wait();
    source.callStateUpdated.emit({});
    source.mediaStateUpdated.emit([MEDIA, true]);
    expect(calls).toEqual([`join:${ROOM_ID}`]);

    releaseJoin.wake();
    await settled.wait();
    expect(calls).toEqual([`join:${ROOM_ID}`, 'joined', 'call', 'media:true']);
    unbind();
  });

  test('a leave reaches the handlers that joined', async ({ expect }) => {
    const { registry, joinedAtom, handlers, unbind } = setup();
    const { handler, calls, releaseJoin, settled } = makeHandler();
    releaseJoin.wake();
    registry.set(handlers, [handler]);

    registry.set(joinedAtom, true);
    registry.set(joinedAtom, false);
    await settled.wait();
    expect(calls).toEqual([`join:${ROOM_ID}`, 'joined', `leave:${ROOM_ID}`]);
    unbind();
  });

  test('a handler contributed during a call is joined on arrival', async ({ expect }) => {
    const { registry, handlers, unbind } = setup(true);
    const { handler, calls, joinStarted, releaseJoin } = makeHandler();
    releaseJoin.wake();

    registry.set(handlers, [handler]);
    await joinStarted.wait();
    expect(calls).toEqual([`join:${ROOM_ID}`]);
    unbind();
  });

  test('a failing handler does not stop the next event', async ({ expect }) => {
    const { registry, joinedAtom, handlers, source, unbind } = setup();
    const { handler, calls, releaseJoin, settled } = makeHandler();
    releaseJoin.wake();
    registry.set(handlers, [{ ...handler, onJoin: () => Promise.reject(new Error('no endpoint')) }]);

    registry.set(joinedAtom, true);
    source.mediaStateUpdated.emit([MEDIA, false]);
    await settled.wait();
    expect(calls).toEqual(['media:false']);
    unbind();
  });

  test('nothing is delivered after unbinding', async ({ expect }) => {
    const { registry, joinedAtom, handlers, source, unbind } = setup();
    const { handler, calls } = makeHandler();
    registry.set(handlers, [handler]);
    unbind();

    registry.set(joinedAtom, true);
    source.mediaStateUpdated.emit([MEDIA, true]);
    await Promise.resolve();
    expect(calls).toEqual([]);
  });
});
