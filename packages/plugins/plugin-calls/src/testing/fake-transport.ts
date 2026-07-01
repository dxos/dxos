//
// Copyright 2026 DXOS.org
//

import { type MediaTransport } from '../calls/media-transport';
import { type TrackObject } from '../calls/types';

export type FakePublishedTrack = { kind: string; track: MediaStreamTrack | null; descriptor: TrackObject };

/**
 * In-memory {@link MediaTransport} for offline stories and headless tests: records published tracks and
 * returns scripted remote tracks, so `MediaManager` reconciliation can be exercised without a network or SFU.
 */
export class FakeTransport implements MediaTransport {
  public readonly published: FakePublishedTrack[] = [];

  #open = false;
  #counter = 0;

  /** @param resolveRemote Supplies the `MediaStreamTrack` returned by {@link pullTrack} (default: none). */
  constructor(
    private readonly _resolveRemote: (trackData: TrackObject) => MediaStreamTrack | undefined = () => undefined,
  ) {}

  get isOpen(): boolean {
    return this.#open;
  }

  async open(): Promise<void> {
    this.#open = true;
  }

  async close(): Promise<void> {
    this.#open = false;
  }

  async pushTrack(options: { track: MediaStreamTrack | null }): Promise<TrackObject | undefined> {
    if (!options.track) {
      return undefined;
    }
    const descriptor: TrackObject = {
      location: 'local',
      trackName: `fake-${++this.#counter}`,
      sessionId: 'fake-session',
      mid: String(this.#counter),
    };
    this.published.push({ kind: options.track.kind, track: options.track, descriptor });
    return descriptor;
  }

  async pullTrack(options: { trackData: TrackObject }): Promise<MediaStreamTrack | undefined> {
    return this._resolveRemote(options.trackData);
  }
}
