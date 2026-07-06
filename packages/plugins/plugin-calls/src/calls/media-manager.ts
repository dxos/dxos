//
// Copyright 2025 DXOS.org
//

import { DeferredTask, Event, sleep, synchronized } from '@dxos/async';
import { SpeakingMonitor } from '@dxos/av';
import { Resource, cancelWithContext } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type MediaTransport } from './media-transport';
import { type EncodedTrackName, TrackNameCodec, type TrackObject } from './types';
import { getUserMediaTrack } from './util';

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
    // Camera and mic start disabled and unpublished. `turnVideoOn`/`turnAudioOn` acquire and publish the real
    // tracks on demand, and off maps to `disableVideo`/`disableAudio` — RealtimeKit's native enable/disable
    // model, so no black-canvas / inaudible placeholder tracks are needed.
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
    // Remote tracks are pulled purely in response to transport media-change events (participant join/leave or
    // a track toggled/replaced) — never speculatively from the swarm. On each event we re-snapshot the roster
    // and reconcile the cache; the swarm is only consulted at the UI layer to pick which cached stream to show.
    this._mediaChangeUnsubscribe = transport.subscribeMediaChanges(() => this._syncRemoteTracks());
    // Initial sync catches participants already present when we joined (no event fires for those).
    this._syncRemoteTracks();
    this._pushTracksTask!.schedule();
  }

  @synchronized
  async leave(): Promise<void> {
    this._mediaChangeUnsubscribe?.();
    this._mediaChangeUnsubscribe = undefined;
    // Detach remote tracks but never stop them: the transport owns them and stops them on participant-left.
    Object.values(this._state.pulledVideoStreams).forEach((stream) =>
      stream.getTracks().forEach((track) => stream.removeTrack(track)),
    );
    await this._state.peer?.close();
    this._state.peer = undefined;
    this._state.pushedVideoTrack = undefined;
    this._state.pushedAudioTrack = undefined;
    this._state.pushedScreenshareTrack = undefined;
    this._state.pulledAudioTracks = {};
    this._state.pulledVideoStreams = {};
  }

  async turnVideoOn(): Promise<void> {
    log.info('rtk local video on');
    // Acquire the camera before mutating state: if `getUserMedia` is slow or rejects (camera busy/denied),
    // the previous self-view keeps rendering and `videoEnabled` stays false, rather than blanking the tile
    // and leaving inconsistent state (the source of "toggle makes video disappear").
    const nextTrack = await getUserMediaTrack('videoinput', { width: VIDEO_WIDTH, height: VIDEO_HEIGHT });
    this._state.videoTrack?.stop();
    this._state.videoTrack = nextTrack;
    // A fresh `MediaStream` (new reference) makes the self-view rebind to the new track.
    this._state.videoStream = new MediaStream([nextTrack]);

    this._state.videoEnabled = true;
    this.stateUpdated.emit(this._state);
    this._pushTracksTask!.schedule();
  }

  async turnVideoOff(): Promise<void> {
    log.info('rtk local video off');
    this._state.videoTrack?.stop();
    this._state.videoTrack = undefined;
    // Drop the self-view stream so the tile blanks rather than freezing on the last camera frame; the
    // transport unpublishes via `disableVideo` on the next push (video is no longer enabled).
    this._state.videoStream = undefined;

    this._state.videoEnabled = false;
    this.stateUpdated.emit(this._state);
    this._pushTracksTask!.schedule();
  }

  // TODO(mykola): Change to `setAudioEnabled(enabled: boolean)`.
  async turnAudioOn(): Promise<void> {
    void this._speakingMonitor?.close();
    // Acquire the mic before flipping `audioEnabled`: a rejected/denied capture must not leave the state
    // enabled with no real track (which would republish a stale/placeholder track on the next reconcile).
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
    log.info('rtk local screenshare on');
    const peer = this._state.peer;
    if (!peer) {
      return;
    }
    // Screenshare is a distinct producer captured by RealtimeKit itself (not via `getUserMedia` + `pushTrack`
    // like the camera). The returned descriptor is advertised on the swarm as a `screenshare` track; the local
    // track mirrors the sharer's own self-view.
    const { descriptor, localTrack } = await peer.setScreenShareEnabled(true);
    this._state.pushedScreenshareTrack = descriptor;
    this._state.screenshareTrack = localTrack;
    this._state.screenshareVideoStream = localTrack ? new MediaStream([localTrack]) : undefined;
    this._state.screenshareEnabled = true;
    this.stateUpdated.emit(this._state);
  }

  async turnScreenshareOff(): Promise<void> {
    log.info('rtk local screenshare off');
    await this._state.peer?.setScreenShareEnabled(false);
    this._state.pushedScreenshareTrack = undefined;
    this._state.screenshareTrack = undefined;
    this._state.screenshareVideoStream = undefined;
    this._state.screenshareEnabled = false;
    this.stateUpdated.emit(this._state);
  }

  /**
   * Reconcile the pulled-track cache to the transport's current roster. Called only in response to a transport
   * media-change event (and once on join) — never speculatively — so every track handled here is one the
   * transport has actually delivered. Tracks are keyed by the name the publisher advertises in the swarm, so
   * the UI resolves them by swarm data alone. Synchronous, so it runs atomically against `leave`. Remote
   * tracks are never stopped here: the transport owns them and stops them on participant-left / leave.
   */
  private _syncRemoteTracks(): void {
    const peer = this._state.peer;
    if (!peer?.isOpen) {
      return;
    }

    const desiredVideo = new Map<EncodedTrackName, MediaStreamTrack>();
    const desiredAudio = new Map<EncodedTrackName, MediaStreamTrack>();
    for (const { trackData, track } of peer.getRemoteTracks()) {
      // Camera and screenshare both render as video streams; audio plays as a bare track.
      (trackData.trackName === 'audio' ? desiredAudio : desiredVideo).set(TrackNameCodec.encode(trackData), track);
    }

    let updated = false;

    // Video (+ screenshare) streams: drop departed, add new, swap a replaced track in place (preserving the
    // `MediaStream` identity so the UI updates live without a re-render).
    for (const name of Object.keys(this._state.pulledVideoStreams) as EncodedTrackName[]) {
      if (!desiredVideo.has(name)) {
        const stream = this._state.pulledVideoStreams[name];
        stream.getTracks().forEach((track) => stream.removeTrack(track));
        delete this._state.pulledVideoStreams[name];
        updated = true;
      }
    }
    for (const [name, track] of desiredVideo) {
      const stream = this._state.pulledVideoStreams[name];
      if (!stream) {
        this._state.pulledVideoStreams[name] = new MediaStream([track]);
        updated = true;
      } else if (stream.getVideoTracks()[0] !== track) {
        stream.getTracks().forEach((existing) => stream.removeTrack(existing));
        stream.addTrack(track);
        updated = true;
      }
    }

    // Audio tracks.
    for (const name of Object.keys(this._state.pulledAudioTracks) as EncodedTrackName[]) {
      if (!desiredAudio.has(name)) {
        delete this._state.pulledAudioTracks[name];
        updated = true;
      }
    }
    for (const [name, track] of desiredAudio) {
      if (this._state.pulledAudioTracks[name] !== track) {
        this._state.pulledAudioTracks[name] = track;
        updated = true;
      }
    }

    if (updated) {
      log.info('rtk synced remote tracks', {
        video: [...desiredVideo.keys()].map((name) => name.slice(0, 20)),
        audio: [...desiredAudio.keys()].map((name) => name.slice(0, 20)),
      });
      this.stateUpdated.emit(this._state);
    }
  }

  private async _pushTracks(): Promise<void> {
    if (!this._state.peer?.isOpen) {
      return;
    }

    // Publish a track only while its media is enabled. RealtimeKit has native enable/disable semantics, so a
    // disabled camera/mic maps to `disableVideo`/`disableAudio` and each enable is a clean first-enable from
    // the disabled state — matching the native `RtkMeeting` path. Gating on the enabled flag (rather than the
    // track's presence) is what makes that hold: it ensures a toggle is never a custom-track swap while
    // already enabled (`enable → enable → enable`), which RealtimeKit handles unreliably (remote peers freeze
    // on a stale track).
    // Screenshare is published out-of-band via `setScreenShareEnabled` (RealtimeKit self-captures it), so only
    // the camera and mic flow through here.
    let updated = false;
    const [pushVideoResult, pushAudioResult] = await Promise.all([
      this._maybePushTrack(
        this._state.videoEnabled ? this._state.videoTrack : undefined,
        this._state.pushedVideoTrack,
        [{ maxFramerate: MAX_WEB_CAM_FRAMERATE, maxBitrate: MAX_WEB_CAM_BITRATE }],
      ),
      this._maybePushTrack(
        this._state.audioEnabled ? this._state.audioTrack : undefined,
        this._state.pushedAudioTrack,
        [{ networkPriority: 'high' }],
      ),
    ]);

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
        track: await this._state.peer!.pushTrack({
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
