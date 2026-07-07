//
// Copyright 2026 DXOS.org
//

import { type Context } from '@dxos/context';

import { type TrackObject } from './types';

/** A remote track currently available in the transport's roster, with the descriptor the swarm advertises. */
export type RemoteTrack = {
  /** `{ sessionId: deviceKey, trackName: kind, mid: kind }` — encodes to the same name the publisher advertises. */
  trackData: TrackObject;
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

/** A transcription segment produced natively by the transport (e.g. RealtimeKit's on-network ASR). */
export type TranscriptEvent = {
  /** Speaker's participant id (== DXOS device key / swarm `UserState.id`). */
  deviceKey?: string;
  text: string;
  /** ISO timestamp of the segment. */
  started?: string;
  /** True while the segment is still being revised (interim result). */
  pending?: boolean;
  /** Stable id for deduplication across revisions. */
  id?: string;
};

/**
 * Media transport backend for a call: publishes local tracks and resolves remote tracks.
 * Abstracts the concrete signaling/SFU implementation (Cloudflare Calls today, RealtimeKit next) so
 * `MediaManager` and the UI depend only on `MediaStreamTrack`s, never on a specific provider's wire model.
 */
export interface MediaTransport {
  /** True once a live session is established. */
  get isOpen(): boolean;

  /** Establish the live session. Return value is ignored (widened so `Resource`'s `Promise<this>` satisfies it). */
  open(): Promise<unknown>;

  /** Tear down the live session. Return value is ignored. */
  close(): Promise<unknown>;

  /**
   * Publish (or replace) a local track. A `null` track with a `previousTrack` removes it.
   * Returns the transport-specific descriptor of the published track.
   */
  pushTrack(options: {
    ctx: Context;
    track: MediaStreamTrack | null;
    previousTrack?: TrackObject;
    encodings?: RTCRtpEncodingParameters[];
  }): Promise<TrackObject | undefined>;

  /**
   * Toggle screenshare. Screenshare is a distinct producer from the camera, and RealtimeKit captures the
   * display itself, so it does not go through {@link pushTrack}. On enable, returns the swarm descriptor to
   * advertise (a `screenshare`-kinded {@link TrackObject}) and the locally-captured track for the sharer's own
   * self-view; on disable, returns an empty result.
   */
  setScreenShareEnabled(enabled: boolean): Promise<{ descriptor?: TrackObject; localTrack?: MediaStreamTrack }>;

  /**
   * Snapshot every remote track currently available in the transport's roster. Called only in response to a
   * {@link subscribeMediaChanges} event (never speculatively), so a returned track is one the transport has
   * actually delivered — `MediaManager` caches these and the UI resolves them by the swarm-advertised name.
   */
  getRemoteTracks(): RemoteTrack[];

  /** Collect live WebRTC {@link MediaStats} for the debug panel, if the transport exposes them. */
  getStats?(): Promise<MediaStats>;

  /**
   * Subscribe to changes in remote media: a participant joining/leaving or enabling/disabling/replacing their
   * audio, video, or screenshare track. The callback carries no payload — it means "the roster changed, call
   * {@link getRemoteTracks} again" — because a transport (e.g. RealtimeKit) swaps the underlying
   * `MediaStreamTrack` while its swarm-advertised descriptor stays fixed. Returns an unsubscribe.
   */
  subscribeMediaChanges(callback: () => void): () => void;

  /**
   * Subscribe to native transcription events, if the transport provides them. Returns an unsubscribe.
   * Transports without on-network transcription omit this.
   */
  subscribeTranscripts?(callback: (event: TranscriptEvent) => void): () => void;
}
