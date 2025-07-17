//
// Copyright 2025 DXOS.org
//

import { DeferredTask, Event, sleep, synchronized } from '@dxos/async';
import { cancelWithContext, type Context, Resource } from '@dxos/context';
import { log } from '@dxos/log';

import { SpeakingMonitor } from './speaking-monitor';
import { TrackNameCodec, type EncodedTrackName, type TrackObject } from './types';
import {
  type CallsServiceConfig,
  CallsServicePeer,
  createBlackCanvasStreamTrack,
  createInaudibleAudioStreamTrack,
  getScreenshare,
  getUserMediaTrack,
} from './util';

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

  pushedVideoTrack?: TrackObject;
  pushedAudioTrack?: TrackObject;
  pushedScreenshareTrack?: TrackObject;
  peer?: CallsServicePeer;

  pulledAudioTracks: Record<EncodedTrackName, { track: MediaStreamTrack; ctx: Context }>;
  /**
   * Includes video feeds and screenshare feeds of other participants.
   */
  pulledVideoStreams: Record<EncodedTrackName, { stream: MediaStream; ctx: Context }>;
};

// TOOD(burdon): Hard coded.
const VIDEO_WIDTH = 1280;
const VIDEO_HEIGHT = 720;
const MAX_WEB_CAM_FRAMERATE = 24;
const MAX_WEB_CAM_BITRATE = 120_0000;
const RETRY_INTERVAL = 500;

export type MediaManagerParams = {
  serviceConfig: CallsServiceConfig;
};

const USE_INAUDIBLE_AUDIO = false;

export class MediaManager extends Resource {
  public readonly stateUpdated = new Event<MediaState>();
  private readonly _state: MediaState = { pulledVideoStreams: {}, pulledAudioTracks: {} };
  private _speakingMonitor?: SpeakingMonitor = undefined;

  private _trackToReconcile: EncodedTrackName[] = [];
  private _blackCanvasStreamTrack?: MediaStreamTrack = undefined;
  private _inaudibleAudioStreamTrack?: MediaStreamTrack = undefined;
  private _pushTracksTask?: DeferredTask = undefined;
  private _pullTracksTask?: DeferredTask = undefined;

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
    this._blackCanvasStreamTrack = await createBlackCanvasStreamTrack({
      ctx: this._ctx,
      width: VIDEO_WIDTH,
      height: VIDEO_HEIGHT,
    });
    this._state.videoTrack = this._blackCanvasStreamTrack;
    this._state.videoStream = new MediaStream();
    this._state.videoStream.addTrack(this._state.videoTrack);

    if (USE_INAUDIBLE_AUDIO) {
      this._inaudibleAudioStreamTrack = await createInaudibleAudioStreamTrack({ ctx: this._ctx });
      this._state.audioTrack = this._inaudibleAudioStreamTrack;
    }

    this._pushTracksTask = new DeferredTask(this._ctx, async () => {
      await this._pushTracks();
    });
    this._pullTracksTask = new DeferredTask(this._ctx, async () => {
      await this._reconcilePulledMedia();
    });
  }

  protected override async _close(): Promise<void> {
    void this._speakingMonitor?.close();
    this._state.videoTrack && this._state.videoStream?.removeTrack(this._state.videoTrack);
    this._state.audioTrack?.stop();
    this._state.videoTrack?.stop();
    this._state.screenshareTrack?.stop();
    this._pushTracksTask = undefined;
    this._pullTracksTask = undefined;
  }

  @synchronized
  async join(serviceConfig: CallsServiceConfig): Promise<void> {
    this._state.peer = new CallsServicePeer(serviceConfig);
    await this._state.peer!.open();
    this._pushTracksTask!.schedule();
  }

  @synchronized
  async leave(): Promise<void> {
    await Promise.all(Object.values(this._state.pulledAudioTracks).map(({ ctx }) => ctx.dispose()));
    await Promise.all(Object.values(this._state.pulledVideoStreams).map(({ ctx }) => ctx.dispose()));
    this._trackToReconcile = [];
    await this._state.peer?.close();
    this._state.peer = undefined;
    this._state.pushedVideoTrack = undefined;
    this._state.pushedAudioTrack = undefined;
    this._state.pushedScreenshareTrack = undefined;
    this._state.pulledAudioTracks = {};
    this._state.pulledVideoStreams = {};
  }

  async turnVideoOn(): Promise<void> {
    this._state.videoStream!.removeTrack(this._state.videoTrack!);
    this._state.videoTrack = await getUserMediaTrack('videoinput', { width: VIDEO_WIDTH, height: VIDEO_HEIGHT });
    this._state.videoStream!.addTrack(this._state.videoTrack);
    this._state.videoEnabled = true;
    this.stateUpdated.emit(this._state);
    this._pushTracksTask!.schedule();
  }

  async turnVideoOff(): Promise<void> {
    if (this._state.videoTrack !== this._blackCanvasStreamTrack) {
      this._state.videoStream!.removeTrack(this._state.videoTrack!);
      this._state.videoTrack?.stop();
      this._state.videoTrack = this._blackCanvasStreamTrack;
      this._state.videoStream!.addTrack(this._state.videoTrack!);
    }

    this._state.videoEnabled = false;
    this.stateUpdated.emit(this._state);
    this._pushTracksTask!.schedule();
  }

  // TODO(mykola): Change to `setAudioEnabled(enabled: boolean)`.
  async turnAudioOn(): Promise<void> {
    void this._speakingMonitor?.close();
    this._state.audioEnabled = true;
    this._state.audioTrack = await getUserMediaTrack('audioinput', {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 16_000,
    });
    this.stateUpdated.emit(this._state);
    this._pushTracksTask!.schedule();
    this._speakingMonitor = new SpeakingMonitor(this._state.audioTrack!);
    this._speakingMonitor.speakingChanged.on(this._ctx, () => this.stateUpdated.emit(this._state));
    void this._speakingMonitor.open();
  }

  async turnAudioOff(): Promise<void> {
    void this._speakingMonitor?.close();
    this._speakingMonitor = undefined;
    this._state.audioEnabled = false;
    if (USE_INAUDIBLE_AUDIO && this._state.audioTrack !== this._inaudibleAudioStreamTrack) {
      this._state.audioTrack?.stop();
      this._state.audioTrack = this._inaudibleAudioStreamTrack;
    } else {
      this._state.audioTrack?.stop();
      this._state.audioTrack = undefined;
    }
    this.stateUpdated.emit(this._state);
    this._pushTracksTask!.schedule();
  }

  async turnScreenshareOn(): Promise<void> {
    const ms = await getScreenshare({ contentHint: 'text' });
    this._state.screenshareVideoStream = ms;
    this._state.screenshareTrack = ms.getVideoTracks()[0];
    this._state.screenshareEnabled = true;
    this.stateUpdated.emit(this._state);
    this._pushTracksTask!.schedule();
  }

  async turnScreenshareOff(): Promise<void> {
    this._state.screenshareEnabled = false;
    this._state.screenshareTrack?.stop();
    this._state.screenshareTrack = undefined;
    this.stateUpdated.emit(this._state);
    this._pushTracksTask!.schedule();
  }

  /**
   * @internal
   */
  _schedulePullTracks(tracks?: EncodedTrackName[]): void {
    if (
      !tracks ||
      (this._trackToReconcile.every((name) => tracks.includes(name)) && this._trackToReconcile.length === tracks.length)
    ) {
      return;
    }

    this._trackToReconcile = tracks;
    this._pullTracksTask!.schedule();
  }

  private async _reconcilePulledMedia(): Promise<void> {
    log('reconciling tracks');
    // TODO(mykola): Currently cloudflare fails if you try to pull track immediately after pushing it.
    // Add retry logic, remove sleep.
    // Wait for cloudflare to process the track.
    await cancelWithContext(this._ctx, sleep(800));
    const trackNames = this._trackToReconcile;

    const tracksToPull = trackNames.filter(
      (name) => !this._state.pulledAudioTracks[name] && !this._state.pulledVideoStreams[name],
    );

    const audioTracksToClose = Object.entries(this._state.pulledAudioTracks).filter(
      ([key]) => !trackNames.some((name) => name === key),
    );

    const videoStreamsToClose = Object.entries(this._state.pulledVideoStreams).filter(
      ([key]) => !trackNames.some((name) => name === key),
    );

    log('reconciling tracks', {
      trackNames,
      tracksToPull,
      videoStreamsToClose,
      audioTracksToClose,
      currentAudioTracks: Object.keys(this._state.pulledAudioTracks),
      currentVideoStreams: Object.keys(this._state.pulledVideoStreams),
    });

    // Pull new tracks.
    await Promise.all(tracksToPull.map((name) => this._pullTrack(name)));

    // Close old tracks.
    await Promise.all([...audioTracksToClose, ...videoStreamsToClose].map(([_, { ctx }]) => ctx.dispose()));

    log('reconciled tracks', {
      currentAudioTracks: Object.keys(this._state.pulledAudioTracks),
      currentVideoStreams: Object.keys(this._state.pulledVideoStreams),
    });
    this.stateUpdated.emit(this._state);
  }

  private async _pushTracks(): Promise<void> {
    if (!this._state.peer?.isOpen) {
      return;
    }

    let updated = false;
    const [pushedVideoTrack, pushedAudioTrack, pushedScreenshareTrack] = await Promise.all([
      this._pushTrack(this._state.videoTrack, this._state.pushedVideoTrack, [
        { maxFramerate: MAX_WEB_CAM_FRAMERATE, maxBitrate: MAX_WEB_CAM_BITRATE },
      ]),
      this._pushTrack(this._state.audioTrack, this._state.pushedAudioTrack, [{ networkPriority: 'high' }]),
      this._pushTrack(this._state.screenshareTrack, this._state.pushedScreenshareTrack),
    ]);

    if (pushedVideoTrack !== this._state.pushedVideoTrack) {
      this._state.pushedVideoTrack = pushedVideoTrack;
      updated = true;
    }
    if (pushedAudioTrack !== this._state.pushedAudioTrack) {
      this._state.pushedAudioTrack = pushedAudioTrack;
      updated = true;
    }
    if (pushedScreenshareTrack !== this._state.pushedScreenshareTrack) {
      this._state.pushedScreenshareTrack = pushedScreenshareTrack;
      updated = true;
    }
    if (!updated) {
      return;
    }

    this.stateUpdated.emit(this._state);
  }

  private async _pullTrack(name: EncodedTrackName): Promise<void> {
    const ctx = this._ctx.derive();
    try {
      const trackData = TrackNameCodec.decode(name);
      const track = await this._state.peer!.pullTrack({ trackData, ctx });
      if (track?.readyState === 'ended') {
        throw new Error('Pulled track ended immediately');
      }

      switch (track?.kind) {
        case 'audio': {
          this._state.pulledAudioTracks[name] = { track, ctx };
          ctx.onDispose(() => delete this._state.pulledAudioTracks[name]);
          break;
        }
        case 'video': {
          const mediaStream = new MediaStream();
          mediaStream.addTrack(track);
          this._state.pulledVideoStreams[name] = { stream: mediaStream, ctx };
          ctx.onDispose(() => {
            mediaStream.removeTrack(track);
            track.stop();
            delete this._state.pulledVideoStreams[name];
          });
          break;
        }
        default:
          throw new Error(`Invalid track kind: ${track?.kind}`);
      }
    } catch (err) {
      log.verbose('failed to pull track', { err, name });
      void ctx.dispose();
      await cancelWithContext(this._ctx, sleep(RETRY_INTERVAL));
      log.verbose('retrying pull track', { name });
      this._pullTracksTask!.schedule();
    }
  }

  private async _pushTrack(
    track?: MediaStreamTrack,
    previousTrack?: TrackObject,
    encodings?: RTCRtpEncodingParameters[],
  ): Promise<TrackObject | undefined> {
    if (!track && !previousTrack) {
      return;
    }

    return this._state.peer!.pushTrack({
      track: track ?? null,
      previousTrack,
      encodings,
    });
  }
}
