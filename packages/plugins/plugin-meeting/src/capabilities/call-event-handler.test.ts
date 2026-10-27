//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';
import * as Registry from 'effect/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { Event, Trigger } from '@dxos/async';
import { type Database, type Feed } from '@dxos/echo';
import * as CallManager from '@dxos/plugin-calls/CallManager';
import type * as CallsCapabilities from '@dxos/plugin-calls/CallsCapabilities';
import type * as TranscriptionCapabilities from '@dxos/plugin-transcription/TranscriptionCapabilities';

import { type MeetingCapabilities } from '#types';

import { type MeetingPayload, makeCallEventHandler } from './call-event-handler.ts';

const ACTIVITY_KEY = 'org.dxos.type.meeting';

/** Records what the meeting asks of transcription; `setEnabled` mirrors the real manager's atom. */
class FakeTranscriptionManager implements TranscriptionCapabilities.TranscriptionManager {
  readonly enabled = Atom.make(false);
  readonly calls: string[] = [];
  track?: MediaStreamTrack;
  recording?: boolean;

  setFeed(_db: Database.Database, _feed: Feed.Feed): void {
    this.calls.push('setFeed');
  }

  async setAudioTrack(track?: MediaStreamTrack): Promise<void> {
    this.track = track;
  }

  setRecording(recording?: boolean): void {
    this.recording = recording;
  }

  async setEnabled(enabled: boolean): Promise<void> {
    this.calls.push(`setEnabled:${enabled}`);
  }

  async flush(): Promise<void> {}

  async open(): Promise<this> {
    this.calls.push('open');
    return this;
  }

  async close(): Promise<this> {
    this.calls.push('close');
    return this;
  }
}

const makeStore = (registry: Registry.AtomRegistry): MeetingCapabilities.MeetingStateStore => {
  const stateAtom = Atom.make<MeetingCapabilities.MeetingState>({}).pipe(Atom.keepAlive);
  return {
    stateAtom,
    get state() {
      return registry.get(stateAtom);
    },
    updateState: (updater) => registry.set(stateAtom, updater(registry.get(stateAtom))),
  };
};

/** A stand-in microphone (node has no `MediaStreamTrack`); only its identity is compared. */
class FakeTrack extends EventTarget implements MediaStreamTrack {
  contentHint = '';
  enabled = true;
  readonly id = crypto.randomUUID();
  readonly kind = 'audio';
  readonly label = 'fake microphone';
  readonly muted = false;
  readonly readyState = 'live';
  onended = null;
  onmute = null;
  onunmute = null;
  async applyConstraints(): Promise<void> {}
  clone(): MediaStreamTrack {
    return new FakeTrack();
  }
  getCapabilities(): MediaTrackCapabilities {
    return {};
  }
  getConstraints(): MediaTrackConstraints {
    return {};
  }
  getSettings(): MediaTrackSettings {
    return {};
  }
  stop(): void {}
}

const makeTrack = (): MediaStreamTrack => new FakeTrack();

const media = (audioTrack?: MediaStreamTrack): CallManager.MediaState => ({
  audioTrack,
  pulledAudioTracks: {},
  pulledVideoStreams: {},
});

const setup = () => {
  const registry = Registry.make();
  const store = makeStore(registry);
  const managers: FakeTranscriptionManager[] = [];
  const payloads: MeetingPayload[] = [];
  const microphone = makeTrack();
  const payloadHandled = new Trigger();
  const handler = makeCallEventHandler({
    store,
    activityKey: ACTIVITY_KEY,
    getMediaState: () => media(microphone),
    createTranscriptionManager: () => {
      const manager = new FakeTranscriptionManager();
      managers.push(manager);
      return manager;
    },
    handlePayload: async (payload) => {
      payloads.push(payload);
      // What `MeetingOperation.HandlePayload` does with the manager the join created.
      await store.state.transcriptionManager?.setEnabled(payload.transcriptionEnabled ?? false);
      payloadHandled.wake();
    },
  });
  return { registry, store, managers, payloads, microphone, payloadHandled, handler };
};

describe('makeCallEventHandler', () => {
  test('joining opens a transcription manager on the microphone already live', async ({ expect }) => {
    const { store, managers, microphone, handler } = setup();
    await handler.onJoin({ roomId: 'room' });

    expect(managers).toHaveLength(1);
    expect(managers[0].calls).toEqual(['open']);
    expect(managers[0].track).toBe(microphone);
    expect(store.state.transcriptionManager).toBe(managers[0]);
  });

  test('media updates follow the track and speaking state', async ({ expect }) => {
    const { managers, handler } = setup();
    await handler.onJoin({ roomId: 'room' });
    const track = makeTrack();
    await handler.onMediaStateUpdated([media(track), true]);

    expect(managers[0].track).toBe(track);
    expect(managers[0].recording).toBe(true);
  });

  test('only the meeting activity is handled as a payload', async ({ expect }) => {
    const { payloads, handler } = setup();
    await handler.onCallStateUpdated({ activities: { other: { payload: { transcriptionEnabled: true } } } });
    await handler.onCallStateUpdated({ activities: { [ACTIVITY_KEY]: { payload: { transcriptionEnabled: true } } } });

    expect(payloads).toEqual([{ transcriptionEnabled: true }]);
  });

  test('leaving closes the manager and clears the meeting state', async ({ expect }) => {
    const { store, managers, handler } = setup();
    await handler.onJoin({ roomId: 'room' });
    await handler.onLeave('room');

    expect(managers[0].calls).toEqual(['open', 'close']);
    expect(store.state).toEqual({});
  });

  test('a rejoin closes the previous manager', async ({ expect }) => {
    const { managers, handler } = setup();
    await handler.onJoin({ roomId: 'room' });
    await handler.onJoin({ roomId: 'room' });

    expect(managers[0].calls).toEqual(['open', 'close']);
    expect(managers[1].calls).toEqual(['open']);
  });

  test('through the call dispatcher, a broadcast enable reaches the manager the join opened', async ({ expect }) => {
    const { registry, managers, payloadHandled, handler } = setup();
    const joinedAtom = Atom.make(false).pipe(Atom.keepAlive);
    const source = {
      joinedAtom,
      roomIdAtom: Atom.make<string | undefined>('room'),
      callStateUpdated: new Event<CallManager.CallState>(),
      mediaStateUpdated: new Event<[CallManager.MediaState, boolean]>(),
    };
    const handlers = Atom.make<CallsCapabilities.CallProperties[]>([handler]);
    const unbind = CallManager.bindCallEvents({ registry, source, handlers });

    // Emitted in the same tick as the join, before the manager has finished opening.
    registry.set(joinedAtom, true);
    source.callStateUpdated.emit({ activities: { [ACTIVITY_KEY]: { payload: { transcriptionEnabled: true } } } });
    await payloadHandled.wait();

    expect(managers).toHaveLength(1);
    expect(managers[0].calls).toEqual(['open', 'setEnabled:true']);
    unbind();
  });
});
