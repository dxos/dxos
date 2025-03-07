//
// Copyright 2025 DXOS.org
//

import { DeferredTask, Event, scheduleTaskInterval, sleep, waitForCondition } from '@dxos/async';
import { cancelWithContext, type Context, Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { TrackNameCodec, type EncodedTrackName, type TrackObject } from '../types';
import { type CallsServiceConfig, CallsServicePeer, getScreenshare, getUserMediaTrack } from '../util';

export type MediaState = {
  audioDeviceId?: string;
  audioEnabled?: boolean;
  audioTrack?: MediaStreamTrack;

  videoDeviceId?: string;
  videoEnabled?: boolean;
  videoTrack?: MediaStreamTrack;
  videoStream?: MediaStream;

  screenshareEnabled?: boolean;
  screenshareVideoTrack?: MediaStreamTrack;

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

export type MediaManagerParams = {
  serviceConfig: CallsServiceConfig;
};

export class MediaManager extends Resource {
  public readonly stateUpdated = new Event<MediaState>();
  private readonly _state: MediaState = { pulledVideoStreams: {}, pulledAudioTracks: {} };

  private _trackToReconcile: EncodedTrackName[] = [];
  private _blackCanvasStreamTrack?: MediaStreamTrack = undefined;
  private _pushTracksTask?: DeferredTask = undefined;
  private _pullTracksTask?: DeferredTask = undefined;

  /**
   * @internal
   */
  _getState() {
    return this._state;
  }

  protected override async _open() {
    this._blackCanvasStreamTrack = await createBlackCanvasStreamTrack(this._ctx);
    this._state.videoTrack = this._blackCanvasStreamTrack;
    this._state.videoStream = new MediaStream();
    this._state.videoStream.addTrack(this._state.videoTrack);

    this._pushTracksTask = new DeferredTask(this._ctx, async () => {
      await this._pushTracks();
    });

    this._pullTracksTask = new DeferredTask(this._ctx, async () => {
      await this._reconcilePulledMedia();
    });
  }

  protected override async _close() {
    this._state.videoTrack && this._state.videoStream?.removeTrack(this._state.videoTrack);
    this._state.audioTrack?.stop();
    this._state.videoTrack?.stop();
    this._state.screenshareVideoTrack?.stop();
    this._pushTracksTask = undefined;
    this._pullTracksTask = undefined;
  }

  async join(serviceConfig: CallsServiceConfig) {
    this._state.peer = new CallsServicePeer(serviceConfig);
    await this._state.peer!.open();
    this._pushTracksTask!.schedule();
  }

  async leave() {
    await Promise.all(Object.values(this._state.pulledAudioTracks).map(({ ctx }) => ctx.dispose()));
    await Promise.all(Object.values(this._state.pulledVideoStreams).map(({ ctx }) => ctx.dispose()));
    this._trackToReconcile = [];
    await this._state.peer?.close();
    this._state.peer = undefined;
  }

  async turnVideoOn() {
    this._state.videoStream!.removeTrack(this._state.videoTrack!);
    this._state.videoTrack = await getUserMediaTrack('videoinput', { width: VIDEO_WIDTH, height: VIDEO_HEIGHT });
    this._state.videoStream!.addTrack(this._state.videoTrack);
    this._state.videoEnabled = true;
    this.stateUpdated.emit(this._state);
    this._pushTracksTask!.schedule();
  }

  async turnVideoOff() {
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

  async turnAudioOn() {
    this._state.audioEnabled = true;
    this._state.audioTrack = await getUserMediaTrack('audioinput');
    this.stateUpdated.emit(this._state);
    this._pushTracksTask!.schedule();
  }

  async turnAudioOff() {
    this._state.audioEnabled = false;
    this._state.audioTrack?.stop();
    this._state.audioTrack = undefined;
    this.stateUpdated.emit(this._state);
    this._pushTracksTask!.schedule();
  }

  async turnScreenshareOn() {
    const ms = await getScreenshare({ contentHint: 'text' });
    this._state.screenshareVideoTrack = ms?.getVideoTracks()[0];
    this._state.screenshareEnabled = true;
    this.stateUpdated.emit(this._state);
    this._pushTracksTask!.schedule();
  }

  async turnScreenshareOff() {
    this._state.screenshareEnabled = false;
    this._state.screenshareVideoTrack?.stop();
    this._state.screenshareVideoTrack = undefined;
    this.stateUpdated.emit(this._state);
    this._pushTracksTask!.schedule();
  }

  /**
   * @internal
   */
  _schedulePullTracks(tracks?: EncodedTrackName[]) {
    if (
      !tracks ||
      (this._trackToReconcile.every((name) => tracks.includes(name)) && this._trackToReconcile.length === tracks.length)
    ) {
      return;
    }

    this._trackToReconcile = tracks;
    this._pullTracksTask!.schedule();
  }

  private async _reconcilePulledMedia() {
    log('reconciling tracks');
    // Wait for cloudflare to process the track.
    await cancelWithContext(this._ctx, sleep(1000));
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
      pulledAudioTracks: Object.keys(this._state.pulledAudioTracks),
      pulledVideoStreams: Object.keys(this._state.pulledVideoStreams),
    });

    // Pull new tracks.
    await Promise.all(
      tracksToPull.map(async (name) => {
        const ctx = this._ctx.derive();
        const trackData = TrackNameCodec.decode(name);
        const track = await this._state
          .peer!.pullTrack({ trackData, ctx })
          .catch((err) => log.warn('Error while pulling track', { err }));

        if (track?.kind === 'audio') {
          this._state.pulledAudioTracks[name] = { track, ctx };
          ctx.onDispose(() => delete this._state.pulledAudioTracks[name]);
        } else if (track?.kind === 'video') {
          const mediaStream = new MediaStream();
          mediaStream.addTrack(track);
          this._state.pulledVideoStreams[name] = { stream: mediaStream, ctx };
          ctx.onDispose(() => {
            mediaStream.removeTrack(track);
            delete this._state.pulledVideoStreams[name];
          });
        } else {
          log.warn('failed to pull track', { trackData });
        }
      }),
    );

    // Close old tracks.
    await Promise.all([...audioTracksToClose, ...videoStreamsToClose].map(([_, { ctx }]) => ctx.dispose()));

    log('reconciled tracks', {
      audioTracks: Object.keys(this._state.pulledAudioTracks),
      videoStreams: Object.keys(this._state.pulledVideoStreams),
    });
    this.stateUpdated.emit(this._state);
  }

  private async _pushTracks() {
    if (!this._state.peer?.isOpen) {
      return;
    }

    // Video track.
    const pushedVideoTrack = await this._pushTrack(this._state.videoTrack, this._state.pushedVideoTrack, [
      { maxFramerate: MAX_WEB_CAM_FRAMERATE, maxBitrate: MAX_WEB_CAM_BITRATE },
    ]);
    if (pushedVideoTrack !== this._state.pushedVideoTrack) {
      this._state.pushedVideoTrack = pushedVideoTrack;
    }

    // Audio track.
    const pushedAudioTrack = await this._pushTrack(this._state.audioTrack, this._state.pushedAudioTrack, [
      { networkPriority: 'high' },
    ]);
    if (pushedAudioTrack !== this._state.pushedAudioTrack) {
      this._state.pushedAudioTrack = pushedAudioTrack;
    }

    // Screenshare track.
    const pushedScreenshareTrack = await this._pushTrack(
      this._state.screenshareVideoTrack,
      this._state.pushedScreenshareTrack,
    );
    if (pushedScreenshareTrack !== this._state.pushedScreenshareTrack) {
      this._state.pushedScreenshareTrack = pushedScreenshareTrack;
    }

    // No tracks to updated.
    if (!pushedVideoTrack && !pushedAudioTrack && !pushedScreenshareTrack) {
      return;
    }

    this.stateUpdated.emit(this._state);
  }

  private async _pushTrack(
    track?: MediaStreamTrack,
    previousTrack?: TrackObject,
    encodings?: RTCRtpEncodingParameters[],
  ) {
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

const createBlackCanvasStreamTrack = async (ctx: Context) => {
  const canvas = document.createElement('canvas');
  canvas.width = VIDEO_WIDTH;
  canvas.height = VIDEO_HEIGHT;

  const canvasCtx = canvas.getContext('2d');
  invariant(canvasCtx);
  const drawFrame = () => {
    canvasCtx.fillStyle = 'black';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
  };
  scheduleTaskInterval(ctx, async () => drawFrame(), 1_000);

  const track = canvas.captureStream().getVideoTracks()[0];
  drawFrame();

  await cancelWithContext(ctx, waitForCondition({ condition: () => track.readyState === 'live', timeout: 1_000 }));

  return track;
};
