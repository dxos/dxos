//
// Copyright 2026 DXOS.org
//

import { type Context, Resource } from '@dxos/context';
import { log } from '@dxos/log';

import { type RoomJoiner } from './edge-room-joiner';
import { type MediaTransport, type RemoteTrack, type TranscriptEvent } from './media-transport';
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
  /**
   * Screenshare is a distinct producer from the camera. Unlike {@link enableVideo}, RealtimeKit captures the
   * display itself (prompts `getDisplayMedia`) — it takes no custom track — and exposes the result on
   * {@link screenShareTracks}.
   */
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
  /**
   * Subscribe to remote-media changes: a participant joining/leaving or enabling/disabling/replacing a
   * media track. Fires with no payload (means "re-resolve"). Returns an unsubscribe.
   */
  onMediaChanged(callback: () => void): () => void;
  /** Subscribe to native transcription events; returns an unsubscribe. */
  onTranscript(callback: (transcript: RealtimeKitTranscript) => void): () => void;
  leave(): Promise<void>;
}

export type RealtimeKitMeetingFactory = (authToken: string) => Promise<RealtimeKitMeeting>;

export type RealtimeKitTransportOptions = {
  roomId: string;
  /** Own HALO device key hex; sent as `custom_participant_id` and used to scope published tracks. */
  deviceKey: string;
  /**
   * RealtimeKit meeting id already coordinated via the swarm. When set, the edge reuses that meeting so
   * every participant shares one SFU session; omitted by the first joiner, which creates one.
   */
  meetingId?: string;
  joiner: RoomJoiner;
  createMeeting: RealtimeKitMeetingFactory;
  /**
   * Called with the resolved meeting id as soon as the edge join returns — before the (slow) SFU connect.
   * Lets the caller advertise it promptly so concurrently-joining peers converge on one meeting.
   */
  onMeetingResolved?: (meetingId: string) => void;
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
      meetingId: this._options.meetingId,
    });
    this.#meetingId = meetingId;
    // Advertise before the SFU connect (which takes seconds) so a concurrent joiner sees this meeting id
    // rather than minting a second meeting.
    this._options.onMeetingResolved?.(meetingId);
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
      log.info('rtk pushTrack disable', { kind });
      if (kind === 'audio') {
        await meeting.self.disableAudio();
      } else if (kind === 'video') {
        await meeting.self.disableVideo();
      }
      return undefined;
    }

    const kind: TrackKind = options.track.kind === 'audio' ? 'audio' : 'video';
    log.info('rtk pushTrack enable', {
      kind,
      track: options.track.id?.slice(0, 8),
      readyState: options.track.readyState,
    });
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
      log.info('rtk screenshare disable');
      await meeting.self.disableScreenShare();
      return {};
    }
    // RealtimeKit captures the display itself. Return the `screenshare`-kinded descriptor (so the swarm name
    // matches what `getRemoteTracks` produces for remotes) and the local track for the sharer's self-view.
    log.info('rtk screenshare enable');
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
      // Descriptor mirrors `pushTrack`'s return (`mid: kind`) so it encodes to the same name the publisher
      // advertises in the swarm — letting the UI resolve this track by that name without any extra mapping.
      const add = (kind: TrackKind, track?: MediaStreamTrack): void => {
        if (track && track.readyState !== 'ended') {
          tracks.push({ trackData: { location: 'remote', sessionId: deviceKey, trackName: kind, mid: kind }, track });
        }
      };
      add('video', participant.videoTrack);
      add('audio', participant.audioTrack);
      add('screenshare', participant.screenShareTracks?.video);
    }
    log.info('rtk remote tracks', {
      tracks: tracks.map((remote) => ({
        peer: remote.trackData.sessionId?.slice(0, 12),
        kind: remote.trackData.trackName,
        track: remote.track.id?.slice(0, 8),
      })),
    });
    return tracks;
  }

  subscribeMediaChanges(callback: () => void): () => void {
    const meeting = this.#meeting;
    if (!meeting) {
      return () => {};
    }
    return meeting.onMediaChanged(callback);
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
    // `init` only prepares the client (preview state); `join` actually connects to the SFU so remote
    // participants appear in `participants.joined` and media is exchanged.
    await meeting.join();
    return {
      self: meeting.self,
      getRemoteParticipants: () => meeting.participants.joined.toArray(),
      onMediaChanged: (callback) => {
        // A remote track can be swapped (camera on/off, device change) while the participant stays in the
        // roster, so listen to each participant's media events — not just roster join/leave. RealtimeKit
        // emits `videoUpdate`/`audioUpdate`/`screenShareUpdate` per participant with the new track.
        const joined = meeting.participants.joined;
        const mediaEvents = ['videoUpdate', 'audioUpdate', 'screenShareUpdate'] as const;
        type JoinedParticipant = ReturnType<typeof joined.toArray>[number];
        const notify = () => {
          log.info('rtk media changed', {
            roster: joined.toArray().map((participant) => ({
              peer: participant.customParticipantId?.slice(0, 12),
              videoEnabled: participant.videoEnabled,
              hasVideo: !!participant.videoTrack,
              audioEnabled: participant.audioEnabled,
              hasAudio: !!participant.audioTrack,
              screenShare: !!participant.screenShareTracks?.video,
            })),
          });
          callback();
        };
        const attach = (participant: JoinedParticipant) =>
          mediaEvents.forEach((event) => participant.on(event, notify));
        const detach = (participant: JoinedParticipant) =>
          mediaEvents.forEach((event) => participant.off(event, notify));
        joined.toArray().forEach(attach);
        const onJoined = (participant: JoinedParticipant) => {
          attach(participant);
          notify();
        };
        const onLeft = (participant: JoinedParticipant) => {
          detach(participant);
          notify();
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
      leave: () => meeting.leave(),
    };
  };
