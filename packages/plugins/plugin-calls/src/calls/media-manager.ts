//
// Copyright 2025 DXOS.org
//

import { DeferredTask, Event, sleep, synchronized } from '@dxos/async';
import { SpeakingMonitor } from '@dxos/av';
import { Resource, cancelWithContext } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type MediaTransport } from './media-transport.ts';
import { type EncodedTrackName, TrackNameCodec, type TrackObject } from './types.ts';
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

  pushedVideoTrack?: TrackObject;
  pushedAudioTrack?: TrackObject;
  pushedScreenshareTrack?: TrackObject;
  peer?: MediaTransport;

  pulledAudioTracks: Record<EncodedTrackName, MediaStreamTrack>;
  /**
   * Includes video feeds and screenshare feeds of other participants.
   */
  pulledVideoStreams: Record<EncodedTrackName, MediaStream>;
};

// TOOD(burdon): Hard coded.
const VIDEO_WIDTH = 1280;
const VIDEO_HEIGHT = 720;
const MAX_WEB_CAM_FRAMERATE = 24;
const MAX_WEB_CAM_BITRATE = 120_0000;
const RETRY_INTERVAL = 100;

export class MediaManager extends Resource {
  public readonly stateUpdated = new Event<MediaState>();

  private readonly _state: MediaState = {
    pulledVideoStreams: {},
    pulledAudioTracks: {},
  };

  private _speakingMonitor?: SpeakingMonitor = undefined;
  private _pushTracksTask?: DeferredTask = undefined;
  private _mediaChangeUnsubscribe?: () => void = undefined;

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
    this._pushTracksTask = new DeferredTask(this._ctx, async () => {
      await this._pushTracks();
    });
  }

  protected override async _close(): Promise<void> {
    void this._speakingMonitor?.close();
    this._state.videoTrack && this._state.videoStream?.removeTrack(this._state.videoTrack);
    this._state.audioTrack?.stop();
    this._state.videoTrack?.stop();
    this._state.screenshareTrack?.stop();
    this._pushTracksTask = undefined;
  }

  @synchronized
  async join(transport: MediaTransport): Promise<void> {
    this._state.peer = transport;
    await this._state.peer.open();
    // Remote tracks follow the transport's roster events, never the swarm; the UI picks streams by advertised name.
    this._mediaChangeUnsubscribe = transport.subscribeMediaChanges(() => this._syncRemoteTracks());
    // No event fires for participants already present when we joined.
    this._syncRemoteTracks();
    this._pushTracksTask!.schedule();
  }

  @synchronized
  async leave(): Promise<void> {
    this._mediaChangeUnsubscribe?.();
    this._mediaChangeUnsubscribe = undefined;
    // The transport owns the remote tracks and stops them on close.
    await this._state.peer?.close();
    this._state.peer = undefined;
    this._state.pushedVideoTrack = undefined;
    this._state.pushedAudioTrack = undefined;
    this._state.pushedScreenshareTrack = undefined;
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
    this._pushTracksTask!.schedule();
  }

  async turnVideoOff(): Promise<void> {
    this._state.videoTrack?.stop();
    this._state.videoTrack = undefined;
    // Dropping the stream blanks the tile rather than freezing it on the last frame.
    this._state.videoStream = undefined;

    this._state.videoEnabled = false;
    this.stateUpdated.emit(this._state);
    this._pushTracksTask!.schedule();
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
    this._pushTracksTask!.schedule();
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
    this._pushTracksTask!.schedule();
  }

  async turnScreenshareOn(): Promise<void> {
    const peer = this._state.peer;
    if (!peer) {
      return;
    }
    // The transport captures the display itself; its local track is the sharer's own self-view.
    const { descriptor, localTrack } = await peer.setScreenShareEnabled(true);
    this._state.pushedScreenshareTrack = descriptor;
    this._state.screenshareTrack = localTrack;
    this._state.screenshareVideoStream = localTrack ? new MediaStream([localTrack]) : undefined;
    this._state.screenshareEnabled = true;
    this.stateUpdated.emit(this._state);
  }

  async turnScreenshareOff(): Promise<void> {
    await this._state.peer?.setScreenShareEnabled(false);
    this._state.pushedScreenshareTrack = undefined;
    this._state.screenshareTrack = undefined;
    this._state.screenshareVideoStream = undefined;
    this._state.screenshareEnabled = false;
    this.stateUpdated.emit(this._state);
  }

  /**
   * Rebuilds the pulled-track cache from the transport's roster, keyed by the name each publisher advertises on the
   * swarm. Synchronous, so it runs atomically against `leave`.
   */
  private _syncRemoteTracks(): void {
    const peer = this._state.peer;
    if (!peer?.isOpen) {
      return;
    }

    // An unchanged video track keeps its `MediaStream` wrapper: the UI binds `srcObject` to it, and a new one flickers.
    const pulledVideoStreams: Record<EncodedTrackName, MediaStream> = {};
    const pulledAudioTracks: Record<EncodedTrackName, MediaStreamTrack> = {};
    let changed = false;
    for (const { trackData, track } of peer.getRemoteTracks()) {
      const name = TrackNameCodec.encode(trackData);
      if (trackData.trackName === 'audio') {
        pulledAudioTracks[name] = track;
        changed ||= this._state.pulledAudioTracks[name] !== track;
      } else {
        const existing = this._state.pulledVideoStreams[name];
        if (existing?.getVideoTracks()[0] === track) {
          pulledVideoStreams[name] = existing;
        } else {
          pulledVideoStreams[name] = new MediaStream([track]);
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

  private async _pushTracks(): Promise<void> {
    // Captured for the whole push: a leave or rejoin can swap `_state.peer` while it awaits.
    const peer = this._state.peer;
    if (!peer?.isOpen) {
      return;
    }

    // Gated on the enabled flag, not the track, so every enable starts from disabled: RealtimeKit handles a track
    // swap while enabled unreliably (remote peers freeze). Screenshare goes through `setScreenShareEnabled`.
    let updated = false;
    const [pushVideoResult, pushAudioResult] = await Promise.all([
      this._maybePushTrack(
        peer,
        this._state.videoEnabled ? this._state.videoTrack : undefined,
        this._state.pushedVideoTrack,
        [{ maxFramerate: MAX_WEB_CAM_FRAMERATE, maxBitrate: MAX_WEB_CAM_BITRATE }],
      ),
      this._maybePushTrack(
        peer,
        this._state.audioEnabled ? this._state.audioTrack : undefined,
        this._state.pushedAudioTrack,
        [{ networkPriority: 'high' }],
      ),
    ]);

    // The call ended or switched peers meanwhile; the new peer schedules its own push on join.
    if (this._state.peer !== peer) {
      return;
    }

    if (pushVideoResult.track !== this._state.pushedVideoTrack) {
      this._state.pushedVideoTrack = pushVideoResult.track;
      updated = true;
    }
    if (pushAudioResult.track !== this._state.pushedAudioTrack) {
      this._state.pushedAudioTrack = pushAudioResult.track;
      updated = true;
    }

    const shouldRetry = pushVideoResult.shouldRetry || pushAudioResult.shouldRetry;
    if (updated) {
      this.stateUpdated.emit(this._state);
    }

    if (shouldRetry) {
      await cancelWithContext(this._ctx, sleep(RETRY_INTERVAL));
      log.info('retrying push tracks', { pushVideoResult, pushAudioResult });
      invariant(this._pushTracksTask);
      this._pushTracksTask.schedule();
    }
  }

  private async _maybePushTrack(
    peer: MediaTransport,
    track?: MediaStreamTrack,
    previousTrack?: TrackObject,
    encodings?: RTCRtpEncodingParameters[],
  ): Promise<{ track?: TrackObject; shouldRetry?: boolean }> {
    if (!track && !previousTrack) {
      return { track: undefined };
    }

    const ctx = this._ctx.derive();
    try {
      return {
        track: await peer.pushTrack({
          ctx,
          track: track ?? null,
          previousTrack,
          encodings,
        }),
      };
    } catch (err) {
      log.info('failed to push track', { err, track, previousTrack, encodings });
      void ctx.dispose();
      return { shouldRetry: true };
    }
  }
}
