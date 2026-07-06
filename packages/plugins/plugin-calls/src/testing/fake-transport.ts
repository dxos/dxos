//
// Copyright 2026 DXOS.org
//

import { type MediaTransport, type RemoteTrack, type TranscriptEvent } from '../calls/media-transport';
import { type TrackObject } from '../calls/types';

export type FakePublishedTrack = { kind: string; track: MediaStreamTrack | null; descriptor: TrackObject };

/** A single publish operation, so tests can assert the exact enable/disable sequence a transport receives. */
export type FakeTransportEvent = { op: 'enable' | 'disable'; kind: string; track: MediaStreamTrack | null };

/**
 * In-memory {@link MediaTransport} for offline stories and headless tests: records published tracks and
 * exposes a scripted remote roster, so `MediaManager` reconciliation can be exercised without a network or SFU.
 */
export class FakeTransport implements MediaTransport {
  public readonly published: FakePublishedTrack[] = [];
  /** Full ordered publish log, including unpublishes — mirrors a native SFU's enable/disable calls. */
  public readonly events: FakeTransportEvent[] = [];
  /** Local track returned from `setScreenShareEnabled(true)` for the sharer's self-view; tests may set it. */
  public screenShareLocalTrack?: MediaStreamTrack;

  #open = false;
  #counter = 0;
  #remoteTracks: RemoteTrack[] = [];
  readonly #transcriptListeners = new Set<(event: TranscriptEvent) => void>();
  readonly #mediaChangeListeners = new Set<() => void>();

  get isOpen(): boolean {
    return this.#open;
  }

  async open(): Promise<void> {
    this.#open = true;
  }

  async close(): Promise<void> {
    this.#open = false;
  }

  async pushTrack(options: {
    track: MediaStreamTrack | null;
    previousTrack?: TrackObject;
  }): Promise<TrackObject | undefined> {
    if (!options.track) {
      // Unpublish: the kind is carried on the prior descriptor's `trackName` (as the real transport does).
      this.events.push({ op: 'disable', kind: options.previousTrack?.trackName ?? 'unknown', track: null });
      return undefined;
    }
    // `trackName` carries the kind (matching `RealtimeKitTransport`) so a later unpublish can resolve it.
    const descriptor: TrackObject = {
      location: 'local',
      trackName: options.track.kind,
      sessionId: 'fake-session',
      mid: String(++this.#counter),
    };
    this.published.push({ kind: options.track.kind, track: options.track, descriptor });
    this.events.push({ op: 'enable', kind: options.track.kind, track: options.track });
    return descriptor;
  }

  async setScreenShareEnabled(enabled: boolean): Promise<{ descriptor?: TrackObject; localTrack?: MediaStreamTrack }> {
    this.events.push({
      op: enabled ? 'enable' : 'disable',
      kind: 'screenshare',
      track: enabled ? (this.screenShareLocalTrack ?? null) : null,
    });
    if (!enabled) {
      return {};
    }
    return {
      descriptor: { location: 'local', trackName: 'screenshare', sessionId: 'fake-session', mid: 'screenshare' },
      localTrack: this.screenShareLocalTrack,
    };
  }

  getRemoteTracks(): RemoteTrack[] {
    return this.#remoteTracks;
  }

  subscribeMediaChanges(callback: () => void): () => void {
    this.#mediaChangeListeners.add(callback);
    return () => this.#mediaChangeListeners.delete(callback);
  }

  /** Test helper: replace the remote roster and notify subscribers (mimics a RealtimeKit media event). */
  setRemoteTracks(tracks: RemoteTrack[]): void {
    this.#remoteTracks = tracks;
    this.#mediaChangeListeners.forEach((listener) => listener());
  }

  subscribeTranscripts(callback: (event: TranscriptEvent) => void): () => void {
    this.#transcriptListeners.add(callback);
    return () => this.#transcriptListeners.delete(callback);
  }

  /** Test helper: emit a scripted native transcript event to subscribers. */
  emitTranscript(event: TranscriptEvent): void {
    this.#transcriptListeners.forEach((listener) => listener(event));
  }
}
