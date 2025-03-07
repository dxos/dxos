//
// Copyright 2025 DXOS.org
//

import { type PublicKey, type Client } from '@dxos/client';
import { Resource } from '@dxos/context';
import { create } from '@dxos/live-object';
import { isNonNullable } from '@dxos/util';

import { CallSwarmSynchronizer, type CallState } from './call-swarm-synchronizer';
import { MediaManager, type MediaState } from './media-manager';
import { type TranscriptionState, CALLS_URL, type EncodedTrackName, TrackNameCodec } from '../types';

export type GlobalState = { call: CallState; media: MediaState };

/**
 * Top level manager for call state.
 */
export class CallManager extends Resource {
  /**
   * Live object state. Is changed on internal events.
   * CAUTION: Do not change directly.
   */
  private readonly _state = create<GlobalState>({
    call: {},
    media: { pulledAudioTracks: {}, pulledVideoStreams: {} },
  });

  private readonly _swarmSynchronizer: CallSwarmSynchronizer;
  private readonly _mediaManager: MediaManager;

  get raisedHand() {
    return this._state.call.raisedHand ?? false;
  }

  get speaking() {
    return this._state.call.speaking ?? false;
  }

  get joined() {
    return this._state.call.joined ?? false;
  }

  get self() {
    return this._state.call.self ?? {};
  }

  get tracks() {
    return this._state.call.tracks ?? {};
  }

  get transcription() {
    return this._state.call.transcription ?? {};
  }

  get users() {
    return this._state.call.users ?? [];
  }

  get media() {
    return this._state.media;
  }

  get pulledAudioTracks() {
    return Object.values(this._state.media.pulledAudioTracks).map((track) => track.track);
  }

  getVideoStream(name?: EncodedTrackName): MediaStream | undefined {
    return name ? this._state.media.pulledVideoStreams[name]?.stream : undefined;
  }

  setRoomId(roomId: PublicKey) {
    this._swarmSynchronizer._setRoomId(roomId);
  }

  setSpeaking(speaking: boolean) {
    this._swarmSynchronizer.setSpeaking(speaking);
  }

  setRaisedHand(raisedHand: boolean) {
    this._swarmSynchronizer.setRaisedHand(raisedHand);
  }

  setTranscription(transcription: TranscriptionState) {
    this._swarmSynchronizer.setTranscription(transcription);
  }

  turnAudioOn() {
    return this._mediaManager.turnAudioOn();
  }

  turnAudioOff() {
    return this._mediaManager.turnAudioOff();
  }

  turnVideoOn() {
    return this._mediaManager.turnVideoOn();
  }

  turnVideoOff() {
    return this._mediaManager.turnVideoOff();
  }

  turnScreenshareOn() {
    return this._mediaManager.turnScreenshareOn();
  }

  turnScreenshareOff() {
    return this._mediaManager.turnScreenshareOff();
  }

  constructor(private readonly _client: Client) {
    super();
    this._swarmSynchronizer = new CallSwarmSynchronizer({ networkService: _client.services.services.NetworkService! });
    this._mediaManager = new MediaManager();
  }

  protected override async _open() {
    await this._mediaManager.open();
    await this._swarmSynchronizer.open();
    const subscription = this._client.halo.identity.subscribe((identity) => {
      if (identity) {
        this._swarmSynchronizer._setIdentity(identity);
      }
      if (this._client.halo.device) {
        this._swarmSynchronizer._setDevice(this._client.halo.device);
      }
    });
    this._swarmSynchronizer.stateUpdated.on(this._ctx, (state) => this._onCallStateUpdated(state));
    this._mediaManager.stateUpdated.on(this._ctx, (state) => this._onMediaStateUpdated(state));
    this._ctx.onDispose(() => subscription.unsubscribe());
  }

  protected override async _close() {
    await this._swarmSynchronizer.leave();
    await this._swarmSynchronizer.close();
    await this._mediaManager.close();
  }

  // TODO(mykola): Reconcile with _swarmSynchronizer.state.joined.
  async join() {
    this._swarmSynchronizer.setJoined(true);
    await this._swarmSynchronizer.join();
    await this._mediaManager.join({
      iceServers: this._client.config.get('runtime.services.ice'),
      apiBase: `${CALLS_URL}/api/calls`,
    });
  }

  async leave() {
    await this._swarmSynchronizer.leave();
    this._swarmSynchronizer.setJoined(false);
    await this._mediaManager.leave();
  }

  private _onCallStateUpdated(state: CallState) {
    const tracksToPull = state.users
      ?.filter((user) => user.joined && user.id !== state.self?.id)
      ?.flatMap((user) => [user.tracks?.video, user.tracks?.audio, user.tracks?.screenshare])
      .filter(isNonNullable);
    this._mediaManager._schedulePullTracks(tracksToPull as EncodedTrackName[]);

    this._updateState();
  }

  private _onMediaStateUpdated(state: MediaState) {
    this._swarmSynchronizer.setTracks({
      video: state.pushedVideoTrack ? TrackNameCodec.encode(state.pushedVideoTrack) : undefined,
      audio: state.pushedAudioTrack ? TrackNameCodec.encode(state.pushedAudioTrack) : undefined,
      screenshare: state.pushedScreenshareTrack ? TrackNameCodec.encode(state.pushedScreenshareTrack) : undefined,
    });

    this._updateState();
  }

  /**
   * Only this method is allowed to change state.
   */
  private _updateState() {
    this._state.call = this._swarmSynchronizer._getState();
    this._state.media = this._mediaManager._getState();
  }
}
