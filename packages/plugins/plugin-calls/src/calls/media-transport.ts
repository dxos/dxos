//
// Copyright 2026 DXOS.org
//

import { type Context } from '@dxos/context';

import { type TrackObject } from './types';

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

  /** Resolve a remote track referenced by `trackData` into a playable `MediaStreamTrack`. */
  pullTrack(options: { ctx: Context; trackData: TrackObject }): Promise<MediaStreamTrack | undefined>;
}
