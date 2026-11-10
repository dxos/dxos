//
// Copyright 2026 DXOS.org
//

import { type Event } from '@dxos/async';

/** A kind of media a participant publishes; screenshare is its own kind, separate from the camera's video. */
export type TrackKind = 'audio' | 'video' | 'screenshare';

/** A remote participant's track, keyed by the device that publishes it (== swarm `UserState.id`). */
export type RemoteTrack = {
  deviceKey: string;
  kind: TrackKind;
  track: MediaStreamTrack;
};

/** WebRTC stats for the live session, for the debug panel. */
export type MediaStats = {
  /**
   * Per locally-published track (camera/mic/screenshare), the flattened `RTCStatsReport` for its send side —
   * bitrate, framerate, resolution, packet loss, RTT, codec, etc. Inbound (per-peer receive) stats are not
   * exposed by the RealtimeKit public API, so only the outbound side is reported.
   */
  outbound: Array<{ kind: string; stats: Record<string, unknown> }>;
};

/** A segment of this peer's own speech, transcribed by the transport's on-network ASR. */
export type TranscriptEvent = {
  text: string;
  /** ISO time the segment was spoken. */
  started: string;
  /** True while the segment is still being revised; only the final text is kept. */
  pending: boolean;
};

/**
 * Why the provider ended a session it was asked to keep: `ended` when the meeting was closed or this participant
 * removed, `lost` when the connection failed and a rejoin may succeed.
 */
export type CloseReason = 'ended' | 'lost';

/**
 * Media transport backend for a call: publishes local tracks and resolves remote tracks.
 * Abstracts the provider (RealtimeKit; tests use a fake) so `MediaManager` and the UI depend only on
 * `MediaStreamTrack`s, never on a provider's wire model.
 */
export interface MediaTransport {
  /** True once a live session is established. */
  readonly isOpen: boolean;

  /** The provider session this transport joined (a RealtimeKit meeting id): what peers agree on over the swarm. */
  readonly meetingId: string | undefined;

  /** Establish the live session. Return value is ignored (widened so `Resource`'s `Promise<this>` satisfies it). */
  open(): Promise<unknown>;

  /** Tear down the live session. Return value is ignored. */
  close(): Promise<unknown>;

  /** Publish the microphone, or unpublish it with `undefined`. */
  setAudio(track: MediaStreamTrack | undefined): Promise<void>;

  /** Publish the camera, or unpublish it with `undefined`. */
  setVideo(track: MediaStreamTrack | undefined): Promise<void>;

  /**
   * Toggle screen share. The provider captures the display itself, so this takes no track; it returns the captured
   * track for the sharer's own self-view when enabling.
   */
  setScreenShare(enabled: boolean): Promise<MediaStreamTrack | undefined>;

  /** Snapshot every remote track the transport has delivered; called after each {@link mediaChanged}. */
  getRemoteTracks(): RemoteTrack[];

  /** Collect live WebRTC {@link MediaStats} for the debug panel. */
  getStats(): Promise<MediaStats>;

  /**
   * Fires when remote media changes: a participant joining or leaving or changing a track. It carries no payload
   * because a provider swaps a `MediaStreamTrack` while the participant stays the same; call {@link getRemoteTracks}.
   */
  readonly mediaChanged: Event<void>;

  /** This peer's own speech, transcribed: revisions while pending, then the final text. */
  readonly transcript: Event<TranscriptEvent>;

  /** Fires once when the provider ends the session; never for {@link close}. */
  readonly closed: Event<CloseReason>;
}

export type CreateTransportOptions = {
  /** DXN of the object anchoring the call; also the swarm room id. */
  roomId: string;
  /** Provider session the swarm already agreed on; the first joiner omits it. */
  meetingId?: string;
};

/** Builds the transport for a room: the one seam `CallManager` is tested through (see `FakeTransport`). */
export type CreateTransport = (options: CreateTransportOptions) => MediaTransport;
