//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Context } from '@dxos/context';

import { type TranscriptEvent } from './media-transport';
import {
  type RealtimeKitMeeting,
  type RealtimeKitRemoteParticipant,
  type RealtimeKitTranscript,
  RealtimeKitTransport,
} from './realtime-kit-transport';

const makeAudioTrack = (): MediaStreamTrack => {
  const audioContext = new AudioContext();
  return audioContext.createMediaStreamDestination().stream.getAudioTracks()[0];
};

const makeVideoTrack = (): MediaStreamTrack => {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  return canvas.captureStream(1).getVideoTracks()[0];
};

class FakeMeeting implements RealtimeKitMeeting {
  public enabledAudio?: MediaStreamTrack;
  public enabledVideo?: MediaStreamTrack;
  public left = false;
  public remote: RealtimeKitRemoteParticipant[] = [];
  /** Track surfaced on `self.screenShareTracks.video` once screenshare is enabled. */
  public screenShareVideoTrack?: MediaStreamTrack;

  public readonly self = {
    enableAudio: async (track?: MediaStreamTrack) => {
      this.enabledAudio = track;
    },
    disableAudio: () => {
      this.enabledAudio = undefined;
    },
    enableVideo: async (track?: MediaStreamTrack) => {
      this.enabledVideo = track;
    },
    disableVideo: () => {
      this.enabledVideo = undefined;
    },
    enableScreenShare: async () => {
      this.self.screenShareTracks = { video: this.screenShareVideoTrack };
    },
    disableScreenShare: async () => {
      this.self.screenShareTracks = undefined;
    },
    screenShareTracks: undefined as { audio?: MediaStreamTrack; video?: MediaStreamTrack } | undefined,
  };

  getRemoteParticipants(): RealtimeKitRemoteParticipant[] {
    return this.remote;
  }

  onMediaChanged(): () => void {
    return () => {};
  }

  #transcriptCallback?: (transcript: RealtimeKitTranscript) => void;

  onTranscript(callback: (transcript: RealtimeKitTranscript) => void): () => void {
    this.#transcriptCallback = callback;
    return () => {
      this.#transcriptCallback = undefined;
    };
  }

  emitTranscript(transcript: RealtimeKitTranscript): void {
    this.#transcriptCallback?.(transcript);
  }

  async leave(): Promise<void> {
    this.left = true;
  }
}

const makeTransport = (meeting: FakeMeeting, deviceKey = 'my-device') =>
  new RealtimeKitTransport({
    roomId: 'echo:/room',
    deviceKey,
    joiner: async () => ({ meetingId: 'meeting-1', authToken: 'auth-token' }),
    createMeeting: async () => meeting,
  });

describe('RealtimeKitTransport', () => {
  test('open joins the room and initializes the meeting', async ({ expect }) => {
    const meeting = new FakeMeeting();
    const transport = makeTransport(meeting);
    await transport.open();
    expect(transport.isOpen).toBe(true);
    expect(transport.meetingId).toBe('meeting-1');
    await transport.close();
    expect(meeting.left).toBe(true);
  });

  test('pushTrack enables the local track and returns a device-scoped descriptor', async ({ expect }) => {
    const meeting = new FakeMeeting();
    const transport = makeTransport(meeting);
    await transport.open();

    const audioTrack = makeAudioTrack();
    const descriptor = await transport.pushTrack({ ctx: Context.default(), track: audioTrack });

    expect(meeting.enabledAudio).toBe(audioTrack);
    // Descriptor carries (deviceKey, kind) so the swarm broadcasts an identity-resolvable name.
    expect(descriptor).toMatchObject({ sessionId: 'my-device', trackName: 'audio', mid: 'audio', location: 'local' });

    await transport.close();
  });

  test('getRemoteTracks snapshots the roster with swarm-encodable descriptors', async ({ expect }) => {
    const audioTrack = makeAudioTrack();
    const videoTrack = makeVideoTrack();
    const meeting = new FakeMeeting();
    meeting.remote = [{ customParticipantId: 'peer-device', audioTrack, videoTrack }];

    const transport = makeTransport(meeting);
    await transport.open();

    // Descriptor mirrors `pushTrack`'s return (`mid == kind`) so it encodes to the same name the publisher
    // advertised in the swarm — letting the UI resolve this track by that name.
    expect(transport.getRemoteTracks()).toEqual(
      expect.arrayContaining([
        {
          trackData: { location: 'remote', sessionId: 'peer-device', trackName: 'video', mid: 'video' },
          track: videoTrack,
        },
        {
          trackData: { location: 'remote', sessionId: 'peer-device', trackName: 'audio', mid: 'audio' },
          track: audioTrack,
        },
      ]),
    );

    await transport.close();
  });

  test('getRemoteTracks is empty until participants join', async ({ expect }) => {
    const meeting = new FakeMeeting();
    const transport = makeTransport(meeting);
    await transport.open();

    expect(transport.getRemoteTracks()).toEqual([]);

    await transport.close();
  });

  test('setScreenShareEnabled uses RealtimeKit screenshare and returns a screenshare descriptor', async ({
    expect,
  }) => {
    const screenTrack = makeVideoTrack();
    const meeting = new FakeMeeting();
    meeting.screenShareVideoTrack = screenTrack;
    const transport = makeTransport(meeting);
    await transport.open();

    // Enable: distinct `screenshare` descriptor (not the camera `video`) + the locally-captured track.
    const { descriptor, localTrack } = await transport.setScreenShareEnabled(true);
    expect(descriptor).toMatchObject({ sessionId: 'my-device', trackName: 'screenshare', mid: 'screenshare' });
    expect(localTrack).toBe(screenTrack);
    expect(meeting.self.screenShareTracks?.video).toBe(screenTrack);
    // Screenshare must not touch the camera slot.
    expect(meeting.enabledVideo).toBeUndefined();

    const off = await transport.setScreenShareEnabled(false);
    expect(off).toEqual({});
    expect(meeting.self.screenShareTracks).toBeUndefined();

    await transport.close();
  });

  test('subscribeTranscripts maps native transcript events to the normalized shape', async ({ expect }) => {
    const meeting = new FakeMeeting();
    const transport = makeTransport(meeting);
    await transport.open();

    const received: TranscriptEvent[] = [];
    transport.subscribeTranscripts((event) => received.push(event));
    meeting.emitTranscript({
      customParticipantId: 'peer-device',
      transcript: 'hello',
      isPartialTranscript: true,
      id: 'seg-1',
    });

    expect(received).toEqual([
      { deviceKey: 'peer-device', text: 'hello', started: undefined, pending: true, id: 'seg-1' },
    ]);

    await transport.close();
  });
});
