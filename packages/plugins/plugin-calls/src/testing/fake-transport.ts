//
// Copyright 2026 DXOS.org
//

import { Event } from '@dxos/async';

import {
  type CloseReason,
  type MediaStats,
  type MediaTransport,
  type RemoteTrack,
  type TranscriptEvent,
} from '../calls/media-transport.ts';

/** A single publish operation, so tests can assert the exact enable/disable sequence a transport receives. */
export type FakeTransportEvent = { op: 'enable' | 'disable'; kind: 'audio' | 'video' | 'screenshare' };

export type FakeTransportOptions = {
  /** The meeting this transport reports having joined; defaults to the one it was asked for, else `fake-meeting`. */
  meetingId?: string;
  /** Makes `open` reject, as joining a meeting that is gone or not the room's does. */
  failOpen?: boolean;
};

/**
 * In-memory {@link MediaTransport} for offline stories and headless tests: records what is published and exposes a
 * scripted remote roster and transcript, so `MediaManager` and `CallManager` run without a network or SFU.
 */
export class FakeTransport implements MediaTransport {
  readonly mediaChanged = new Event<void>();
  readonly transcript = new Event<TranscriptEvent>();
  readonly closed = new Event<CloseReason>();

  /** Full ordered publish log — mirrors a native SFU's enable/disable calls. */
  public readonly events: FakeTransportEvent[] = [];
  /** What is published now, by kind. */
  public readonly published: { audio?: MediaStreamTrack; video?: MediaStreamTrack } = {};
  /** Local track returned from `setScreenShare(true)` for the sharer's self-view; tests may set it. */
  public screenShareLocalTrack?: MediaStreamTrack;
  public stats: MediaStats = { outbound: [] };

  #open = false;
  #remoteTracks: RemoteTrack[] = [];

  constructor(private readonly _options: FakeTransportOptions = {}) {}

  get isOpen(): boolean {
    return this.#open;
  }

  get meetingId(): string | undefined {
    return this.#open ? (this._options.meetingId ?? 'fake-meeting') : undefined;
  }

  async open(): Promise<void> {
    if (this._options.failOpen) {
      throw new Error('fake transport refused to open');
    }
    this.#open = true;
  }

  async close(): Promise<void> {
    this.#open = false;
  }

  async setAudio(track: MediaStreamTrack | undefined): Promise<void> {
    this.events.push({ op: track ? 'enable' : 'disable', kind: 'audio' });
    this.published.audio = track;
  }

  async setVideo(track: MediaStreamTrack | undefined): Promise<void> {
    this.events.push({ op: track ? 'enable' : 'disable', kind: 'video' });
    this.published.video = track;
  }

  async setScreenShare(enabled: boolean): Promise<MediaStreamTrack | undefined> {
    this.events.push({ op: enabled ? 'enable' : 'disable', kind: 'screenshare' });
    return enabled ? this.screenShareLocalTrack : undefined;
  }

  getRemoteTracks(): RemoteTrack[] {
    return this.#remoteTracks;
  }

  async getStats(): Promise<MediaStats> {
    return this.stats;
  }

  /** Test helper: replace the remote roster and notify subscribers (mimics a RealtimeKit media event). */
  setRemoteTracks(tracks: RemoteTrack[]): void {
    this.#remoteTracks = tracks;
    this.mediaChanged.emit();
  }

  /** Test helper: this peer's speech as RealtimeKit would transcribe it. */
  emitTranscript(event: Partial<TranscriptEvent> & Pick<TranscriptEvent, 'text'>): void {
    this.transcript.emit({ started: new Date().toISOString(), pending: false, ...event });
  }
}
