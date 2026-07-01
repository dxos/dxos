//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Context } from '@dxos/context';

import {
  type RealtimeKitMeeting,
  type RealtimeKitRemoteParticipant,
  RealtimeKitTransport,
} from './realtime-kit-transport';

const makeAudioTrack = (): MediaStreamTrack => {
  const audioContext = new AudioContext();
  return audioContext.createMediaStreamDestination().stream.getAudioTracks()[0];
};

class FakeMeeting implements RealtimeKitMeeting {
  public enabledAudio?: MediaStreamTrack;
  public enabledVideo?: MediaStreamTrack;
  public left = false;
  public remote: RealtimeKitRemoteParticipant[] = [];

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
  };

  getRemoteParticipants(): RealtimeKitRemoteParticipant[] {
    return this.remote;
  }

  onParticipantsChanged(): () => void {
    return () => {};
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

  test('pullTrack resolves a remote track by device key from the roster', async ({ expect }) => {
    const remoteTrack = makeAudioTrack();
    const meeting = new FakeMeeting();
    meeting.remote = [{ customParticipantId: 'peer-device', audioTrack: remoteTrack }];

    const transport = makeTransport(meeting);
    await transport.open();

    const resolved = await transport.pullTrack({
      ctx: Context.default(),
      trackData: { sessionId: 'peer-device', trackName: 'audio', mid: 'audio', location: 'remote' },
    });
    expect(resolved).toBe(remoteTrack);

    await transport.close();
  });

  test('pullTrack returns undefined when the participant has not joined yet (retryable)', async ({ expect }) => {
    const meeting = new FakeMeeting();
    const transport = makeTransport(meeting);
    await transport.open();

    const resolved = await transport.pullTrack({
      ctx: Context.default(),
      trackData: { sessionId: 'absent-device', trackName: 'audio', mid: 'audio', location: 'remote' },
    });
    expect(resolved).toBeUndefined();

    await transport.close();
  });
});
