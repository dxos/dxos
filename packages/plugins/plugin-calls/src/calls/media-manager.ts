//
// Copyright 2025 DXOS.org
//

import { DeferredTask, Event, synchronized } from '@dxos/async';
import { SpeakingMonitor } from '@dxos/av';
import { type Context, Resource } from '@dxos/context';
import { log } from '@dxos/log';

import { type MediaTransport } from './media-transport.ts';
import { type RemoteTrackKey, remoteTrackKey } from './types.ts';
import { getUserMediaTrack } from './util/index.ts';

export type MediaState = {
  audioDeviceId?: string;
  audioEnabled?: boolean;
  audioTrack?: MediaStreamTrack;

  videoDeviceId?: string;
  videoEnabled?: boolean;
  videoTrack?: MediaStreamTrack;
  videoStream?: MediaStream;

  screenshareEnabled?: boolean;
  screenshareTrack?: MediaStreamTrack;
  screenshareVideoStream?: MediaStream;

  /** The live call's transport, while joined. */
  transport?: MediaTransport;

  /** Remote microphones, by {@link remoteTrackKey}. */
  pulledAudioTracks: Record<RemoteTrackKey, MediaStreamTrack>;
  /** Remote cameras and screenshares, by {@link remoteTrackKey}. */
  pulledVideoStreams: Record<RemoteTrackKey, MediaStream>;
};

// TOOD(burdon): Hard coded.
const VIDEO_WIDTH = 1280;
const VIDEO_HEIGHT = 720;

export class MediaManager extends Resource {
  public readonly stateUpdated = new Event<MediaState>();

  private readonly _state: MediaState = {
    pulledVideoStreams: {},
    pulledAudioTracks: {},
  };

  private _speakingMonitor?: SpeakingMonitor = undefined;
  private _publishTask?: DeferredTask = undefined;
  /** Scoped to one transport, so its listeners go when it does. */
  private _transportCtx?: Context = undefined;
  /** What the transport currently publishes, so only changes reach it. */
  #publishedAudio?: MediaStreamTrack;
  #publishedVideo?: MediaStreamTrack;

  get isSpeaking() {
    return this._speakingMonitor?.isSpeaking;
  }

  /**
   * @internal
   */
  _getState(): MediaState {
    return this._state;
  }

  protected override async _open(): Promise<void> {
    // Camera and mic start unpublished; off maps to the transport's native disable, so no placeholder tracks exist.
    this._publishTask = new DeferredTask(this._ctx, async () => {
      await this._publishTracks();
    });
  }

  protected override async _close(): Promise<void> {
    void this._speakingMonitor?.close();
    this._state.videoTrack && this._state.videoStream?.removeTrack(this._state.videoTrack);
    this._state.audioTrack?.stop();
    this._state.videoTrack?.stop();
    this._state.screenshareTrack?.stop();
    this._publishTask = undefined;
  }

  @synchronized
  async join(transport: MediaTransport): Promise<void> {
    this._state.transport = transport;
    await transport.open();
    // Remote tracks follow the transport's roster events, never the swarm; the UI finds them by device and kind.
    this._transportCtx = this._ctx.derive();
    transport.mediaChanged.on(this._transportCtx, () => this._syncRemoteTracks());
    // No event fires for participants already present when we joined.
    this._syncRemoteTracks();
    this._publishTask!.schedule();
  }

  @synchronized
  async leave(): Promise<void> {
    await this._transportCtx?.dispose();
    this._transportCtx = undefined;
    // The transport owns the remote tracks and stops them on close.
    await this._state.transport?.close();
    this._state.transport = undefined;
    this.#publishedAudio = undefined;
    this.#publishedVideo = undefined;
    this._state.pulledAudioTracks = {};
    this._state.pulledVideoStreams = {};
  }

  async turnVideoOn(): Promise<void> {
    // Acquired before any state changes, so a busy or denied camera leaves the previous self-view and state intact.
    const nextTrack = await getUserMediaTrack('videoinput', { width: VIDEO_WIDTH, height: VIDEO_HEIGHT });
    this._state.videoTrack?.stop();
    this._state.videoTrack = nextTrack;
    // A new `MediaStream` reference makes the self-view rebind to the new track.
    this._state.videoStream = new MediaStream([nextTrack]);

    this._state.videoEnabled = true;
    this.stateUpdated.emit(this._state);
    this._publishTask!.schedule();
  }

  async turnVideoOff(): Promise<void> {
    this._state.videoTrack?.stop();
    this._state.videoTrack = undefined;
    // Dropping the stream blanks the tile rather than freezing it on the last frame.
    this._state.videoStream = undefined;

    this._state.videoEnabled = false;
    this.stateUpdated.emit(this._state);
    this._publishTask!.schedule();
  }

  // TODO(mykola): Change to `setAudioEnabled(enabled: boolean)`.
  async turnAudioOn(): Promise<void> {
    void this._speakingMonitor?.close();
    // Acquired before `audioEnabled` flips, so a denied capture never leaves the state enabled without a track.
    this._state.audioTrack = await getUserMediaTrack('audioinput', {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 16_000,
    });
    this._state.audioEnabled = true;
    this.stateUpdated.emit(this._state);
    this._publishTask!.schedule();
    this._speakingMonitor = new SpeakingMonitor(this._state.audioTrack!);
    this._speakingMonitor.speakingChanged.on(this._ctx, () => this.stateUpdated.emit(this._state));
    void this._speakingMonitor.open();
  }

  async turnAudioOff(): Promise<void> {
    void this._speakingMonitor?.close();
    this._speakingMonitor = undefined;
    this._state.audioEnabled = false;
    this._state.audioTrack?.stop();
    this._state.audioTrack = undefined;
    this.stateUpdated.emit(this._state);
    this._publishTask!.schedule();
  }

  async turnScreenshareOn(): Promise<void> {
    const transport = this._state.transport;
    if (!transport) {
      return;
    }
    // The transport captures the display itself; its local track is the sharer's own self-view.
    const localTrack = await transport.setScreenShare(true);
    this._state.screenshareTrack = localTrack;
    this._state.screenshareVideoStream = localTrack ? new MediaStream([localTrack]) : undefined;
    this._state.screenshareEnabled = true;
    this.stateUpdated.emit(this._state);
  }

  async turnScreenshareOff(): Promise<void> {
    await this._state.transport?.setScreenShare(false);
    this._state.screenshareTrack = undefined;
    this._state.screenshareVideoStream = undefined;
    this._state.screenshareEnabled = false;
    this.stateUpdated.emit(this._state);
  }

  /**
   * Rebuilds the remote-track cache from the transport's roster, keyed by publishing device and kind. Synchronous, so
   * it runs atomically against `leave`.
   */
  private _syncRemoteTracks(): void {
    const transport = this._state.transport;
    if (!transport?.isOpen) {
      return;
    }

    // An unchanged video track keeps its `MediaStream` wrapper: the UI binds `srcObject` to it, and a new one flickers.
    const pulledVideoStreams: Record<RemoteTrackKey, MediaStream> = {};
    const pulledAudioTracks: Record<RemoteTrackKey, MediaStreamTrack> = {};
    let changed = false;
    for (const { deviceKey, kind, track } of transport.getRemoteTracks()) {
      const key = remoteTrackKey(deviceKey, kind);
      if (kind === 'audio') {
        pulledAudioTracks[key] = track;
        changed ||= this._state.pulledAudioTracks[key] !== track;
      } else {
        const existing = this._state.pulledVideoStreams[key];
        if (existing?.getVideoTracks()[0] === track) {
          pulledVideoStreams[key] = existing;
        } else {
          pulledVideoStreams[key] = new MediaStream([track]);
          changed = true;
        }
      }
    }
    changed ||=
      Object.keys(pulledVideoStreams).length !== Object.keys(this._state.pulledVideoStreams).length ||
      Object.keys(pulledAudioTracks).length !== Object.keys(this._state.pulledAudioTracks).length;

    this._state.pulledVideoStreams = pulledVideoStreams;
    this._state.pulledAudioTracks = pulledAudioTracks;

    if (changed) {
      this.stateUpdated.emit(this._state);
    }
  }

  /**
   * Publishes what is enabled and unpublishes what is not, sending only changes. A replaced track is unpublished
   * before the new one goes out: RealtimeKit handles a swap while enabled unreliably (remote peers freeze).
   */
  private async _publishTracks(): Promise<void> {
    const transport = this._state.transport;
    if (!transport?.isOpen) {
      return;
    }

    const audio = this._state.audioEnabled ? this._state.audioTrack : undefined;
    const video = this._state.videoEnabled ? this._state.videoTrack : undefined;
    await Promise.all([
      audio !== this.#publishedAudio &&
        this.#publish(transport, audio, this.#publishedAudio, (track) => transport.setAudio(track)).then(() => {
          this.#publishedAudio = audio;
        }),
      video !== this.#publishedVideo &&
        this.#publish(transport, video, this.#publishedVideo, (track) => transport.setVideo(track)).then(() => {
          this.#publishedVideo = video;
        }),
    ]).catch((err) => log.warn('failed to publish tracks', { err }));
  }

  async #publish(
    transport: MediaTransport,
    track: MediaStreamTrack | undefined,
    published: MediaStreamTrack | undefined,
    set: (track: MediaStreamTrack | undefined) => Promise<void>,
  ): Promise<void> {
    if (track && published) {
      await set(undefined);
    }
    // A leave or rejoin swapped the transport meanwhile; the new one publishes for itself on join.
    if (this._state.transport === transport) {
      await set(track);
    }
  }
}
