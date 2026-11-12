//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type RealtimeKitMeeting, type RealtimeKitRemoteParticipant, type RealtimeKitTranscript } from '@dxos/av';

import { type CloseReason, type MediaStats, type TranscriptEvent } from './media-transport.ts';
import { RealtimeKitTransport } from './realtime-kit-transport.ts';

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
  public stats: MediaStats = { outbound: [] };

  public readonly self = {
    id: 'self-peer',
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

  #mediaChanged?: () => void;
  #transcript?: (transcript: RealtimeKitTranscript) => void;
  #roomLeft?: (state: string) => void;

  getRemoteParticipants(): RealtimeKitRemoteParticipant[] {
    return this.remote;
  }

  onMediaChanged(callback: () => void): () => void {
    this.#mediaChanged = callback;
    return () => (this.#mediaChanged = undefined);
  }

  onTranscript(callback: (transcript: RealtimeKitTranscript) => void): () => void {
    this.#transcript = callback;
    return () => (this.#transcript = undefined);
  }

  onRoomLeft(callback: (state: string) => void): () => void {
    this.#roomLeft = callback;
    return () => (this.#roomLeft = undefined);
  }

  emitMediaChanged(): void {
    this.#mediaChanged?.();
  }

  emitTranscript(transcript: RealtimeKitTranscript): void {
    this.#transcript?.(transcript);
  }

  emitRoomLeft(state: string): void {
    this.#roomLeft?.(state);
  }

  async getStats(): Promise<MediaStats> {
    return this.stats;
  }

  async leave(): Promise<void> {
    this.left = true;
  }
}

const makeTransport = (meeting: FakeMeeting, requests: unknown[] = []) =>
  new RealtimeKitTransport({
    roomId: 'echo:/room',
    meetingId: 'meeting-agreed',
    deviceKey: 'self-device',
    join: async (request) => {
      requests.push(request);
      return { meetingId: 'meeting-1', authToken: 'auth-token' };
    },
    connect: async () => meeting,
  });

describe('RealtimeKitTransport', () => {
  test('open joins the room as this device and connects to the meeting', async ({ expect }) => {
    const meeting = new FakeMeeting();
    const requests: unknown[] = [];
    const transport = makeTransport(meeting, requests);
    await transport.open();
    expect(transport.isOpen).toBe(true);
    expect(transport.meetingId).toBe('meeting-1');
    expect(requests).toEqual([{ roomId: 'echo:/room', meetingId: 'meeting-agreed', deviceKey: 'self-device' }]);
    await transport.close();
    expect(meeting.left).toBe(true);
  });

  test('setAudio and setVideo publish and unpublish the local tracks', async ({ expect }) => {
    const meeting = new FakeMeeting();
    const transport = makeTransport(meeting);
    await transport.open();

    const audioTrack = makeAudioTrack();
    const videoTrack = makeVideoTrack();
    await transport.setAudio(audioTrack);
    await transport.setVideo(videoTrack);
    expect(meeting.enabledAudio).toBe(audioTrack);
    expect(meeting.enabledVideo).toBe(videoTrack);

    await transport.setAudio(undefined);
    await transport.setVideo(undefined);
    expect(meeting.enabledAudio).toBeUndefined();
    expect(meeting.enabledVideo).toBeUndefined();

    await transport.close();
  });

  test('getRemoteTracks keys each track by the publishing device', async ({ expect }) => {
    const audioTrack = makeAudioTrack();
    const videoTrack = makeVideoTrack();
    const meeting = new FakeMeeting();
    meeting.remote = [{ customParticipantId: 'peer-device', audioTrack, videoTrack }, { audioTrack }];

    const transport = makeTransport(meeting);
    await transport.open();

    // A participant without a device key is not a DXOS peer, so it has no tile to land on.
    expect(transport.getRemoteTracks()).toEqual(
      expect.arrayContaining([
        { deviceKey: 'peer-device', kind: 'video', track: videoTrack },
        { deviceKey: 'peer-device', kind: 'audio', track: audioTrack },
      ]),
    );
    expect(transport.getRemoteTracks()).toHaveLength(2);

    let changed = 0;
    transport.mediaChanged.on(() => {
      changed++;
    });
    meeting.emitMediaChanged();
    expect(changed).toBe(1);

    await transport.close();
  });

  test('setScreenShare uses RealtimeKit screenshare and returns the captured track', async ({ expect }) => {
    const screenTrack = makeVideoTrack();
    const meeting = new FakeMeeting();
    meeting.screenShareVideoTrack = screenTrack;
    const transport = makeTransport(meeting);
    await transport.open();

    expect(await transport.setScreenShare(true)).toBe(screenTrack);
    expect(meeting.self.screenShareTracks?.video).toBe(screenTrack);
    // Screenshare must not touch the camera slot.
    expect(meeting.enabledVideo).toBeUndefined();

    expect(await transport.setScreenShare(false)).toBeUndefined();
    expect(meeting.self.screenShareTracks).toBeUndefined();

    await transport.close();
  });

  test('getStats returns the meeting WebRTC stats', async ({ expect }) => {
    const meeting = new FakeMeeting();
    meeting.stats = { outbound: [{ kind: 'video', stats: { 'outbound-rtp-0': { bytesSent: 1000 } } }] };
    const transport = makeTransport(meeting);
    await transport.open();

    expect(await transport.getStats()).toEqual(meeting.stats);

    await transport.close();
  });

  test('transcript carries only this peer’s speech, timed by either field RealtimeKit sends', async ({ expect }) => {
    const meeting = new FakeMeeting();
    const transport = makeTransport(meeting);
    await transport.open();

    const received: TranscriptEvent[] = [];
    transport.transcript.on((event) => {
      received.push(event);
    });
    meeting.emitTranscript({ peerId: 'other-peer', transcript: 'not mine', isPartialTranscript: false });
    meeting.emitTranscript({
      peerId: 'self-peer',
      transcript: 'hello',
      isPartialTranscript: true,
      date: new Date('2026-11-10T12:00:00Z'),
    });
    meeting.emitTranscript({
      peerId: 'self-peer',
      transcript: 'hello there',
      isPartialTranscript: false,
      timestamp: Date.parse('2026-11-10T12:00:01Z'),
    });

    expect(received).toEqual([
      { text: 'hello', started: '2026-11-10T12:00:00.000Z', pending: true },
      { text: 'hello there', started: '2026-11-10T12:00:01.000Z', pending: false },
    ]);

    await transport.close();
  });

  test('closed reports a meeting that ended apart from a connection that was lost', async ({ expect }) => {
    const meeting = new FakeMeeting();
    const transport = makeTransport(meeting);
    await transport.open();

    const reasons: CloseReason[] = [];
    transport.closed.on((reason) => {
      reasons.push(reason);
    });
    meeting.emitRoomLeft('kicked');
    meeting.emitRoomLeft('disconnected');
    meeting.emitRoomLeft('left');

    expect(reasons).toEqual(['ended', 'lost']);

    await transport.close();
  });
});
