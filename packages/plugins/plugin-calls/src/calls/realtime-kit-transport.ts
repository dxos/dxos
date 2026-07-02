//
// Copyright 2026 DXOS.org
//

import { type Context, Resource } from '@dxos/context';
import { log } from '@dxos/log';

import { type RoomJoiner } from './edge-room-joiner';
import { type MediaTransport, type TranscriptEvent } from './media-transport';
import { type TrackObject } from './types';

//
// Minimal subset of the `@cloudflare/realtimekit` SDK this transport depends on. Injected so the
// transport is exercised offline with a fake; the real binding lives in `createRealtimeKitMeetingFactory`.
//

export interface RealtimeKitSelf {
  /** Publish the local mic. RealtimeKit accepts our already-captured track (no double capture). */
  enableAudio(customTrack?: MediaStreamTrack): Promise<void>;
  disableAudio(): Promise<void> | void;
  enableVideo(customTrack?: MediaStreamTrack): Promise<void>;
  disableVideo(): Promise<void> | void;
}

export interface RealtimeKitRemoteParticipant {
  /** Set at participant creation to the DXOS device key (== swarm `UserState.id`). */
  customParticipantId?: string;
  audioTrack?: MediaStreamTrack;
  videoTrack?: MediaStreamTrack;
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
  /** Subscribe to roster changes; returns an unsubscribe. */
  onParticipantsChanged(callback: () => void): () => void;
  /** Subscribe to native transcription events; returns an unsubscribe. */
  onTranscript(callback: (transcript: RealtimeKitTranscript) => void): () => void;
  leave(): Promise<void>;
}

export type RealtimeKitMeetingFactory = (authToken: string) => Promise<RealtimeKitMeeting>;

export type RealtimeKitTransportOptions = {
  roomId: string;
  /** Own HALO device key hex; sent as `custom_participant_id` and used to scope published tracks. */
  deviceKey: string;
  joiner: RoomJoiner;
  createMeeting: RealtimeKitMeetingFactory;
};

const trackKinds = ['audio', 'video', 'screenshare'] as const;
type TrackKind = (typeof trackKinds)[number];

/**
 * {@link MediaTransport} backed by Cloudflare RealtimeKit. RealtimeKit manages the SFU session and
 * per-participant tracks, so this transport does not exchange SDP track descriptors like the Cloudflare
 * Calls peer. Instead it carries `(deviceKey, kind)` in the opaque {@link TrackObject}: publishing enables
 * the local track and returns that descriptor (which the swarm encodes and broadcasts unchanged), and
 * pulling resolves the matching remote track from the RealtimeKit roster by `customParticipantId`. This
 * keeps `MediaManager`, the swarm, and the UI unchanged while swapping the media backend.
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
    });
    this.#meetingId = meetingId;
    this.#meeting = await this._options.createMeeting(authToken);
    log('realtimekit meeting opened', { meetingId });
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

    // A null track with a previous descriptor means "unpublish"; RealtimeKit manages quality itself so
    // `encodings` is ignored.
    if (!options.track) {
      const kind = options.previousTrack?.trackName as TrackKind | undefined;
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

  async pullTrack(options: { ctx: Context; trackData: TrackObject }): Promise<MediaStreamTrack | undefined> {
    const meeting = this.#meeting;
    if (!meeting) {
      return undefined;
    }

    const remoteDeviceKey = options.trackData.sessionId;
    const kind = options.trackData.trackName as TrackKind | undefined;
    const participant = meeting
      .getRemoteParticipants()
      .find((candidate) => candidate.customParticipantId === remoteDeviceKey);
    // Not joined yet: return undefined so `MediaManager` retries once the roster catches up.
    if (!participant) {
      return undefined;
    }

    return kind === 'video' || kind === 'screenshare' ? participant.videoTrack : participant.audioTrack;
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

/**
 * Binds {@link RealtimeKitMeeting} to the real `@cloudflare/realtimekit` client. Loaded lazily so the SDK
 * is only pulled into bundles that actually select the RealtimeKit transport (offline tests inject a fake).
 */
export const createRealtimeKitMeetingFactory =
  (): RealtimeKitMeetingFactory =>
  async (authToken: string): Promise<RealtimeKitMeeting> => {
    const { default: RealtimeKitClient } = await import('@cloudflare/realtimekit');
    // Do not auto-capture on join; `MediaManager` drives capture and hands tracks to `pushTrack`.
    const meeting = await RealtimeKitClient.init({ authToken, defaults: { audio: false, video: false } });
    return {
      self: meeting.self,
      getRemoteParticipants: () => meeting.participants.joined.toArray(),
      onParticipantsChanged: (callback) => {
        // Roster changes (join/leave) are emitted by the `joined` map, not the `participants` container.
        meeting.participants.joined.on('participantsUpdate', callback);
        return () => meeting.participants.joined.off('participantsUpdate', callback);
      },
      onTranscript: (callback) => {
        meeting.ai.on('transcript', callback);
        return () => meeting.ai.off('transcript', callback);
      },
      leave: () => meeting.leave(),
    };
  };
