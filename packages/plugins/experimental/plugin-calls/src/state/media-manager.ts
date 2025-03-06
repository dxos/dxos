//
// Copyright 2025 DXOS.org
//

import { Event, scheduleTaskInterval } from '@dxos/async';
import { type Context, Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';

import { type TrackObject } from '../types';
import { type CallsServiceConfig, CallsServicePeer, getScreenshare, getUserMediaTrack } from '../util';

export type MediaState = {
  audioDeviceId?: string;
  audioEnabled?: boolean;
  audioTrack?: MediaStreamTrack;

  videoDeviceId?: string;
  videoEnabled?: boolean;
  videoTrack?: MediaStreamTrack;

  screenshareEnabled?: boolean;
  screenshareVideoTrack?: MediaStreamTrack;

  pushedVideoTrack?: TrackObject;
  pushedAudioTrack?: TrackObject;
  pushedScreenshareTrack?: TrackObject;
  peer?: CallsServicePeer;
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
  private readonly _state: MediaState = {};

  private _blackCanvasStreamTrack?: MediaStreamTrack = undefined;

  /**
   * @internal
   */
  _getState() {
    return this._state;
  }

  protected override async _open() {
    this._blackCanvasStreamTrack = createBlackCanvasStreamTrack(this._ctx, this._state.videoTrack);
    this._state.videoTrack = this._blackCanvasStreamTrack;
  }

  protected override async _close() {
    this._state.audioTrack?.stop();
    this._state.videoTrack?.stop();
    this._state.screenshareVideoTrack?.stop();
  }

  async join(serviceConfig: CallsServiceConfig) {
    this._state.peer = new CallsServicePeer(serviceConfig);
    await this._state.peer!.open();
    await this._pushTracks();
  }

  async leave() {
    await this._state.peer!.close();
    this._state.peer = undefined;
  }

  async turnVideoOn() {
    this._state.videoTrack = await getUserMediaTrack('videoinput', { width: VIDEO_WIDTH, height: VIDEO_HEIGHT });
    this._state.videoEnabled = true;
    this.stateUpdated.emit(this._state);
    await this._pushTracks();
  }

  async turnVideoOff() {
    if (this._state.videoTrack !== this._blackCanvasStreamTrack) {
      this._state.videoTrack?.stop();
      this._state.videoTrack = this._blackCanvasStreamTrack;
    }

    this._state.videoEnabled = false;
    this.stateUpdated.emit(this._state);
    await this._pushTracks();
  }

  async turnAudioOn() {
    this._state.audioEnabled = true;
    this._state.audioTrack = await getUserMediaTrack('audioinput');
    this.stateUpdated.emit(this._state);
    await this._pushTracks();
  }

  async turnAudioOff() {
    this._state.audioEnabled = false;
    this._state.audioTrack?.stop();
    this._state.audioTrack = undefined;
    this.stateUpdated.emit(this._state);
    await this._pushTracks();
  }

  async turnScreenshareOn() {
    const ms = await getScreenshare({ contentHint: 'text' });
    this._state.screenshareVideoTrack = ms?.getVideoTracks()[0];
    this._state.screenshareEnabled = true;
    this.stateUpdated.emit(this._state);
    await this._pushTracks();
  }

  async turnScreenshareOff() {
    this._state.screenshareEnabled = false;
    this._state.screenshareVideoTrack?.stop();
    this._state.screenshareVideoTrack = undefined;
    this.stateUpdated.emit(this._state);
    await this._pushTracks();
  }

  async _pushTracks() {
    if (!this._state.peer?.isOpen) {
      return;
    }

    // Video track.
    const pushedVideoTrack = await this._pushTrack(this._state.videoTrack, this._state.pushedVideoTrack, [
      { maxFramerate: MAX_WEB_CAM_FRAMERATE, maxBitrate: MAX_WEB_CAM_BITRATE },
    ]);
    if (pushedVideoTrack) {
      this._state.pushedVideoTrack = pushedVideoTrack;
    }

    // Audio track.
    const pushedAudioTrack = await this._pushTrack(this._state.audioTrack, this._state.pushedAudioTrack, [
      { networkPriority: 'high' },
    ]);
    if (pushedAudioTrack) {
      this._state.pushedAudioTrack = pushedAudioTrack;
    }

    // Screenshare track.
    const pushedScreenshareTrack = await this._pushTrack(
      this._state.screenshareVideoTrack,
      this._state.pushedScreenshareTrack,
    );
    if (pushedScreenshareTrack) {
      this._state.pushedScreenshareTrack = pushedScreenshareTrack;
    }

    // No tracks to updated.
    if (!pushedVideoTrack && !pushedAudioTrack && !pushedScreenshareTrack) {
      return;
    }

    this.stateUpdated.emit(this._state);
  }

  async _pushTrack(track?: MediaStreamTrack, previousTrack?: TrackObject, encodings?: RTCRtpEncodingParameters[]) {
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

const createBlackCanvasStreamTrack = (ctx: Context, videoTrack?: MediaStreamTrack) => {
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

  return canvas.captureStream().getVideoTracks()[0];
};
