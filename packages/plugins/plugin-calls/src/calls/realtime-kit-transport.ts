//
// Copyright 2026 DXOS.org
//

import { type Context, Resource } from '@dxos/context';

import { type RoomJoiner } from './edge-room-joiner.ts';
import { type MediaStats, type MediaTransport, type RemoteTrack, type TranscriptEvent } from './media-transport.ts';
import { type TrackObject } from './types.ts';

// The subset of the `@cloudflare/realtimekit` SDK this transport uses, injected so tests can run it offline.

export interface RealtimeKitSelf {
  /** Publish the local mic. RealtimeKit accepts our already-captured track (no double capture). */
  enableAudio(customTrack?: MediaStreamTrack): Promise<void>;
  disableAudio(): Promise<void> | void;
  enableVideo(customTrack?: MediaStreamTrack): Promise<void>;
  disableVideo(): Promise<void> | void;
  /** Unlike {@link enableVideo}, RealtimeKit captures the display itself and exposes it on {@link screenShareTracks}. */
  enableScreenShare(): Promise<void>;
  disableScreenShare(): Promise<void>;
  readonly screenShareTracks?: { audio?: MediaStreamTrack; video?: MediaStreamTrack };
}

export interface RealtimeKitRemoteParticipant {
  /** Set at participant creation to the DXOS device key (== swarm `UserState.id`). */
  customParticipantId?: string;
  audioTrack?: MediaStreamTrack;
  videoTrack?: MediaStreamTrack;
  /** Screenshare is a distinct track pair in RealtimeKit, not the camera `videoTrack`. */
  screenShareTracks?: { audio?: MediaStreamTrack; video?: MediaStreamTrack };
  videoEnabled?: boolean;
  audioEnabled?: boolean;
  screenShareEnabled?: boolean;
}

/** Native transcription segment as delivered by RealtimeKit's `meeting.ai`. */
export interface RealtimeKitTranscript {
  customParticipantId?: string;
  transcript: string;
  isPartialTranscript?: boolean;
  id?: string;
  date?: Date;
}

export interface RealtimeKitMeeting {
  readonly self: RealtimeKitSelf;
  /** Currently-joined remote participants. */
  getRemoteParticipants(): RealtimeKitRemoteParticipant[];
  /** Fires, with no payload, when a participant joins or leaves or changes a track. Returns an unsubscribe. */
  onMediaChanged(callback: () => void): () => void;
  /** Subscribe to native transcription events; returns an unsubscribe. */
  onTranscript(callback: (transcript: RealtimeKitTranscript) => void): () => void;
  /** WebRTC send-side stats for each locally-published track. */
  getStats(): Promise<MediaStats>;
  leave(): Promise<void>;
}

export type RealtimeKitMeetingFactory = (authToken: string) => Promise<RealtimeKitMeeting>;

export type RealtimeKitTransportOptions = {
  roomId: string;
  /** Own HALO device key hex; sent as `custom_participant_id` and used to scope published tracks. */
  deviceKey: string;
  /** Meeting id the swarm already agreed on; the first joiner omits it and EDGE creates one. */
  meetingId?: string;
  joiner: RoomJoiner;
  createMeeting: RealtimeKitMeetingFactory;
  /** Called as soon as EDGE answers, before the slow connect, so concurrent joiners converge on one meeting. */
  onMeetingResolved?: (meetingId: string) => void;
};

const trackKinds = ['audio', 'video', 'screenshare'] as const;
type TrackKind = (typeof trackKinds)[number];

/**
 * {@link MediaTransport} backed by Cloudflare RealtimeKit. Its {@link TrackObject} carries `(deviceKey, kind)`
 * rather than SDP session data, so the name a publisher advertises on the swarm matches the remote track this
 * transport resolves from the roster by `customParticipantId`.
 */
export class RealtimeKitTransport extends Resource implements MediaTransport {
  #meeting?: RealtimeKitMeeting;
  #meetingId?: string;

  constructor(private readonly _options: RealtimeKitTransportOptions) {
    super();
  }

  get meetingId(): string | undefined {
    return this.#meetingId;
  }

  protected override async _open(ctx: Context): Promise<void> {
    const { meetingId, authToken } = await this._options.joiner(ctx, {
      roomId: this._options.roomId,
      deviceKey: this._options.deviceKey,
      meetingId: this._options.meetingId,
    });
    this.#meetingId = meetingId;
    this._options.onMeetingResolved?.(meetingId);
    this.#meeting = await this._options.createMeeting(authToken);
  }

  protected override async _close(): Promise<void> {
    await this.#meeting?.leave();
    this.#meeting = undefined;
  }

  async pushTrack(options: {
    ctx: Context;
    track: MediaStreamTrack | null;
    previousTrack?: TrackObject;
    encodings?: RTCRtpEncodingParameters[];
  }): Promise<TrackObject | undefined> {
    const meeting = this.#meeting;
    if (!meeting) {
      return undefined;
    }

    // A null track unpublishes; RealtimeKit manages quality itself, so `encodings` is ignored.
    if (!options.track) {
      const kind = options.previousTrack?.trackName;
      if (kind === 'audio') {
        await meeting.self.disableAudio();
      } else if (kind === 'video') {
        await meeting.self.disableVideo();
      }
      return undefined;
    }

    const kind: TrackKind = options.track.kind === 'audio' ? 'audio' : 'video';
    if (kind === 'audio') {
      await meeting.self.enableAudio(options.track);
    } else {
      await meeting.self.enableVideo(options.track);
    }

    // Descriptor carries our identity + kind rather than SFU session/mid; the swarm encodes it verbatim.
    return { location: 'local', sessionId: this._options.deviceKey, trackName: kind, mid: kind };
  }

  async setScreenShareEnabled(enabled: boolean): Promise<{ descriptor?: TrackObject; localTrack?: MediaStreamTrack }> {
    const meeting = this.#meeting;
    if (!meeting) {
      return {};
    }
    if (!enabled) {
      await meeting.self.disableScreenShare();
      return {};
    }
    await meeting.self.enableScreenShare();
    return {
      descriptor: {
        location: 'local',
        sessionId: this._options.deviceKey,
        trackName: 'screenshare',
        mid: 'screenshare',
      },
      localTrack: meeting.self.screenShareTracks?.video,
    };
  }

  getRemoteTracks(): RemoteTrack[] {
    const meeting = this.#meeting;
    if (!meeting) {
      return [];
    }

    const tracks: RemoteTrack[] = [];
    for (const participant of meeting.getRemoteParticipants()) {
      const deviceKey = participant.customParticipantId;
      if (!deviceKey) {
        continue;
      }
      // Mirrors `pushTrack`'s descriptor so it encodes to the name the publisher advertises.
      const add = (kind: TrackKind, track?: MediaStreamTrack): void => {
        if (track && track.readyState !== 'ended') {
          tracks.push({ trackData: { location: 'remote', sessionId: deviceKey, trackName: kind, mid: kind }, track });
        }
      };
      add('video', participant.videoTrack);
      add('audio', participant.audioTrack);
      add('screenshare', participant.screenShareTracks?.video);
    }
    return tracks;
  }

  subscribeMediaChanges(callback: () => void): () => void {
    const meeting = this.#meeting;
    if (!meeting) {
      return () => {};
    }
    return meeting.onMediaChanged(callback);
  }

  async getStats(): Promise<MediaStats> {
    return (await this.#meeting?.getStats()) ?? { outbound: [] };
  }

  subscribeTranscripts(callback: (event: TranscriptEvent) => void): () => void {
    const meeting = this.#meeting;
    if (!meeting) {
      return () => {};
    }
    return meeting.onTranscript((transcript) =>
      callback({
        deviceKey: transcript.customParticipantId,
        text: transcript.transcript,
        started: transcript.date?.toISOString(),
        pending: transcript.isPartialTranscript,
        id: transcript.id,
      }),
    );
  }
}

/** Binds {@link RealtimeKitMeeting} to the real SDK, imported lazily so it loads only when a call starts. */
export const createRealtimeKitMeetingFactory =
  (): RealtimeKitMeetingFactory =>
  async (authToken: string): Promise<RealtimeKitMeeting> => {
    const { default: RealtimeKitClient } = await import('@cloudflare/realtimekit');
    // No auto-capture: `MediaManager` owns capture.
    const meeting = await RealtimeKitClient.init({ authToken, defaults: { audio: false, video: false } });
    // `init` only prepares the client; `join` connects.
    await meeting.join();
    return {
      self: meeting.self,
      getRemoteParticipants: () => meeting.participants.joined.toArray(),
      onMediaChanged: (callback) => {
        // Per-participant media events too: a track can be swapped while its participant stays in the roster.
        const joined = meeting.participants.joined;
        const mediaEvents = ['videoUpdate', 'audioUpdate', 'screenShareUpdate'] as const;
        type JoinedParticipant = ReturnType<typeof joined.toArray>[number];
        const attach = (participant: JoinedParticipant) =>
          mediaEvents.forEach((event) => participant.on(event, callback));
        const detach = (participant: JoinedParticipant) =>
          mediaEvents.forEach((event) => participant.off(event, callback));
        joined.toArray().forEach(attach);
        const onJoined = (participant: JoinedParticipant) => {
          attach(participant);
          callback();
        };
        const onLeft = (participant: JoinedParticipant) => {
          detach(participant);
          callback();
        };
        joined.on('participantJoined', onJoined);
        joined.on('participantLeft', onLeft);
        return () => {
          joined.toArray().forEach(detach);
          joined.off('participantJoined', onJoined);
          joined.off('participantLeft', onLeft);
        };
      },
      onTranscript: (callback) => {
        meeting.ai.on('transcript', callback);
        return () => meeting.ai.off('transcript', callback);
      },
      getStats: async () => {
        // Only local producers expose `getStats()` publicly.
        const outbound = await Promise.all(
          meeting.self.producers.map(async (producer) => {
            const stats: Record<string, unknown> = {};
            (await producer.getStats()).forEach((entry, id) => {
              stats[id] = entry;
            });
            return { kind: producer.kind, stats };
          }),
        );
        return { outbound };
      },
      leave: () => meeting.leave(),
    };
  };
