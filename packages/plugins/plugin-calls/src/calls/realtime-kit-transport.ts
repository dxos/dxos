//
// Copyright 2026 DXOS.org
//

import { Event } from '@dxos/async';
import {
  type ConnectRealtimeKit,
  type RealtimeKitMeeting,
  type RealtimeKitTranscript,
  connectRealtimeKit,
  transcriptStarted,
} from '@dxos/av';
import { Context, Resource } from '@dxos/context';
import { type EdgeHttpClient, type JoinCallResponse, type JoinCallRoomRequest, joinCallRoom } from '@dxos/edge-client';
import { log } from '@dxos/log';

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

/** Resolves a room's meeting and mints this device's participant token (`joinCallRoom` from `@dxos/edge-client`). */
export type JoinCallRoom = (request: JoinCallRoomRequest) => Promise<JoinCallResponse>;

export type RealtimeKitTransportOptions = CreateTransportOptions & {
  join: JoinCallRoom;
  /** Replaced only by the transport's own browser test. */
  connect?: ConnectRealtimeKit;
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
      deviceKey: this._options.deviceKey,
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
    this.transcript.emit({
      text: transcript.transcript,
      started: transcriptStarted(transcript),
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

/** The app's {@link CreateTransport}: RealtimeKit, joined through calls-service on EDGE as the signed-in identity. */
export const createRealtimeKitTransport =
  (getEdge: () => Pick<EdgeHttpClient, 'request'>): CreateTransport =>
  (options) =>
    new RealtimeKitTransport({ ...options, join: (request) => joinCallRoom(getEdge(), Context.default(), request) });
