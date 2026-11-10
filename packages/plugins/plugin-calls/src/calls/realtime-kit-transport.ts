//
// Copyright 2026 DXOS.org
//

import { Event } from '@dxos/async';
import { Context, Resource } from '@dxos/context';
import { type EdgeHttpClient } from '@dxos/edge-client';
import { log } from '@dxos/log';
import { type JoinCallResponse, type JoinCallRoomRequest } from '@dxos/protocols';

import {
  type CloseReason,
  type CreateTransport,
  type CreateTransportOptions,
  type MediaStats,
  type MediaTransport,
  type RemoteTrack,
  type TrackKind,
  type TranscriptEvent,
} from './media-transport.ts';

// The subset of the `@cloudflare/realtimekit` SDK this transport uses, so its browser test can run it offline.

export interface RealtimeKitSelf {
  /** This connection's peer id; transcripts name the peer that spoke. */
  readonly id: string;
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
  /** The participant's verified device key, set by calls-service (== swarm `UserState.id`). */
  customParticipantId?: string;
  audioTrack?: MediaStreamTrack;
  videoTrack?: MediaStreamTrack;
  /** Screenshare is a distinct track pair in RealtimeKit, not the camera `videoTrack`. */
  screenShareTracks?: { audio?: MediaStreamTrack; video?: MediaStreamTrack };
}

/** Native transcription segment as delivered by RealtimeKit's `meeting.ai`. */
export interface RealtimeKitTranscript {
  peerId: string;
  transcript: string;
  isPartialTranscript: boolean;
  /** The SDK types the time as `date`; RealtimeKit's docs call it `timestamp` (epoch ms), so both are read. */
  date?: Date;
  timestamp?: number;
}

export interface RealtimeKitMeeting {
  readonly self: RealtimeKitSelf;
  /** Currently-joined remote participants. */
  getRemoteParticipants(): RealtimeKitRemoteParticipant[];
  /** Fires, with no payload, when a participant joins or leaves or changes a track. Returns an unsubscribe. */
  onMediaChanged(callback: () => void): () => void;
  /** Subscribe to native transcription events; returns an unsubscribe. */
  onTranscript(callback: (transcript: RealtimeKitTranscript) => void): () => void;
  /** Subscribe to RealtimeKit leaving the room on its own (`LeaveRoomState`); returns an unsubscribe. */
  onRoomLeft(callback: (state: string) => void): () => void;
  /** WebRTC send-side stats for each locally-published track. */
  getStats(): Promise<MediaStats>;
  leave(): Promise<void>;
}

/** Resolves a room's meeting and mints this device's participant token (`EdgeHttpClient.joinCallRoom`). */
export type JoinCallRoom = (request: JoinCallRoomRequest) => Promise<JoinCallResponse>;

export type RealtimeKitTransportOptions = CreateTransportOptions & {
  join: JoinCallRoom;
  /** Connects to a meeting with a participant token; replaced only by the transport's own browser test. */
  connect?: (authToken: string) => Promise<RealtimeKitMeeting>;
};

/** `LeaveRoomState`s after which the meeting is gone for this participant, so rejoining would only fail again. */
const ENDED_STATES = new Set(['kicked', 'ended', 'rejected']);

/** `LeaveRoomState`s that are a lost connection, which a fresh join may recover. */
const LOST_STATES = new Set(['disconnected', 'failed']);

/** {@link MediaTransport} backed by Cloudflare RealtimeKit; remote tracks are keyed by each participant's device. */
export class RealtimeKitTransport extends Resource implements MediaTransport {
  readonly mediaChanged = new Event<void>();
  readonly transcript = new Event<TranscriptEvent>();
  readonly closed = new Event<CloseReason>();

  #meeting?: RealtimeKitMeeting;
  #meetingId?: string;
  #unsubscribe: (() => void)[] = [];

  constructor(private readonly _options: RealtimeKitTransportOptions) {
    super();
  }

  get meetingId(): string | undefined {
    return this.#meetingId;
  }

  protected override async _open(): Promise<void> {
    const { meetingId, authToken } = await this._options.join({
      roomId: this._options.roomId,
      meetingId: this._options.meetingId,
    });
    const meeting = await (this._options.connect ?? connectRealtimeKit)(authToken);
    this.#meetingId = meetingId;
    this.#meeting = meeting;
    this.#unsubscribe = [
      meeting.onMediaChanged(() => this.mediaChanged.emit()),
      meeting.onTranscript((transcript) => this.#onTranscript(meeting, transcript)),
      meeting.onRoomLeft((state) => this.#onRoomLeft(state)),
    ];
  }

  protected override async _close(): Promise<void> {
    this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribe = [];
    await this.#meeting?.leave();
    this.#meeting = undefined;
  }

  async setAudio(track: MediaStreamTrack | undefined): Promise<void> {
    const self = this.#meeting?.self;
    await (track ? self?.enableAudio(track) : self?.disableAudio());
  }

  async setVideo(track: MediaStreamTrack | undefined): Promise<void> {
    const self = this.#meeting?.self;
    await (track ? self?.enableVideo(track) : self?.disableVideo());
  }

  async setScreenShare(enabled: boolean): Promise<MediaStreamTrack | undefined> {
    const self = this.#meeting?.self;
    if (!self) {
      return undefined;
    }
    if (!enabled) {
      await self.disableScreenShare();
      return undefined;
    }
    await self.enableScreenShare();
    return self.screenShareTracks?.video;
  }

  getRemoteTracks(): RemoteTrack[] {
    const tracks: RemoteTrack[] = [];
    for (const participant of this.#meeting?.getRemoteParticipants() ?? []) {
      const deviceKey = participant.customParticipantId;
      if (!deviceKey) {
        continue;
      }
      const add = (kind: TrackKind, track?: MediaStreamTrack): void => {
        if (track && track.readyState !== 'ended') {
          tracks.push({ deviceKey, kind, track });
        }
      };
      add('video', participant.videoTrack);
      add('audio', participant.audioTrack);
      add('screenshare', participant.screenShareTracks?.video);
    }
    return tracks;
  }

  async getStats(): Promise<MediaStats> {
    return (await this.#meeting?.getStats()) ?? { outbound: [] };
  }

  #onTranscript(meeting: RealtimeKitMeeting, transcript: RealtimeKitTranscript): void {
    // Every participant receives every transcript; a peer speaks only for itself.
    if (transcript.peerId !== meeting.self.id) {
      return;
    }
    const time = transcript.date?.getTime() ?? transcript.timestamp;
    this.transcript.emit({
      text: transcript.transcript,
      started: new Date(time !== undefined && Number.isFinite(time) ? time : Date.now()).toISOString(),
      pending: transcript.isPartialTranscript,
    });
  }

  #onRoomLeft(state: string): void {
    log.info('realtimekit left the room', { state });
    if (ENDED_STATES.has(state)) {
      this.closed.emit('ended');
    } else if (LOST_STATES.has(state)) {
      this.closed.emit('lost');
    }
  }
}

/** The app's {@link CreateTransport}: RealtimeKit, joined through calls-service on EDGE as the signed-in device. */
export const createRealtimeKitTransport =
  (getEdge: () => Pick<EdgeHttpClient, 'joinCallRoom'>): CreateTransport =>
  (options) =>
    new RealtimeKitTransport({ ...options, join: (request) => getEdge().joinCallRoom(Context.default(), request) });

/** Binds {@link RealtimeKitMeeting} to the real SDK, imported lazily so it loads only when a call starts. */
const connectRealtimeKit = async (authToken: string): Promise<RealtimeKitMeeting> => {
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
    onRoomLeft: (callback) => {
      const listener = ({ state }: { state: string }) => callback(state);
      meeting.self.on('roomLeft', listener);
      return () => meeting.self.off('roomLeft', listener);
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
