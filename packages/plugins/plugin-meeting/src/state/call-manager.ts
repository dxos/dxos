//
// Copyright 2025 DXOS.org
//

import { synchronized } from '@dxos/async';
import { type Client } from '@dxos/client';
import { Resource } from '@dxos/context';
import { generateName } from '@dxos/display-name';
import { EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import { create } from '@dxos/live-object';
import { TranscriptionManager } from '@dxos/plugin-transcription';
import { isNonNullable, keyToFallback } from '@dxos/util';

import { CallSwarmSynchronizer, type CallState } from './call-swarm-synchronizer';
import { MediaManager, type MediaState } from './media-manager';
import { type TranscriptionState, CALLS_URL, type EncodedTrackName, TrackNameCodec } from '../types';

export type GlobalState = {
  call: CallState;
  media: MediaState;
};

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
  private readonly _transcriptionManager: TranscriptionManager;

  /** @reactive */
  get roomId() {
    return this._state.call.roomId;
  }

  /** @reactive */
  get raisedHand() {
    return this._state.call.raisedHand ?? false;
  }

  /** @reactive */
  get speaking() {
    return this._state.call.speaking ?? false;
  }

  /** @reactive */
  get joined() {
    return this._state.call.joined ?? false;
  }

  /** @reactive */
  get self() {
    return this._state.call.self ?? {};
  }

  /** @reactive */
  get tracks() {
    return this._state.call.tracks ?? {};
  }

  /** @reactive */
  get transcription() {
    return this._state.call.transcription ?? {};
  }

  /** @reactive */
  get users() {
    return this._state.call.users ?? [];
  }

  /** @reactive */
  get media() {
    return this._state.media;
  }

  /** @reactive */
  get pulledAudioTracks() {
    return Object.values(this._state.media.pulledAudioTracks).map((track) => track.track);
  }

  getVideoStream(name?: EncodedTrackName): MediaStream | undefined {
    return name ? this._state.media.pulledVideoStreams[name]?.stream : undefined;
  }

  setRoomId(roomId: string) {
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

    const edgeUrl = this._client.config.get('runtime.services.edge.url');
    invariant(edgeUrl);
    this._transcriptionManager = new TranscriptionManager(new EdgeHttpClient(edgeUrl));
  }

  protected override async _open() {
    await this._mediaManager.open();
    await this._swarmSynchronizer.open();
    const subscription = this._client.halo.identity.subscribe((identity) => {
      if (identity) {
        this._swarmSynchronizer._setIdentity(identity);
        this._transcriptionManager.setName(identity.profile?.displayName ?? generateName(identity.identityKey.toHex()));
        const fallbackValue = keyToFallback(identity!.identityKey);
        const userHue = identity!.profile?.data?.hue || fallbackValue.hue;
        this._transcriptionManager.setHue(userHue);
      }
      if (this._client.halo.device) {
        this._swarmSynchronizer._setDevice(this._client.halo.device);
      }
    });
    this._ctx.onDispose(() => subscription.unsubscribe());

    this._swarmSynchronizer.stateUpdated.on(this._ctx, (state) => this._onCallStateUpdated(state));
    this._mediaManager.stateUpdated.on(this._ctx, (state) => this._onMediaStateUpdated(state));
  }

  protected override async _close() {
    await this._transcriptionManager.close();
    await this._swarmSynchronizer.leave();
    await this._swarmSynchronizer.close();
    await this._mediaManager.close();
  }

  // TODO(mykola): Reconcile with _swarmSynchronizer.state.joined.
  @synchronized
  async join() {
    this._swarmSynchronizer.setJoined(true);
    await this._swarmSynchronizer.join();
    await this._mediaManager.join({
      iceServers: this._client.config.get('runtime.services.ice'),
      apiBase: `${CALLS_URL}/api/calls`,
    });
    await this._transcriptionManager.open();
  }

  @synchronized
  async leave() {
    await this._transcriptionManager.close();
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
    void this._transcriptionManager.setEnabled(state.transcription?.enabled ?? false);
    void this._transcriptionManager.setQueue(state.transcription?.queueDxn);

    this._updateState();
  }

  private _onMediaStateUpdated(state: MediaState) {
    this._swarmSynchronizer.setTracks({
      video: state.pushedVideoTrack ? TrackNameCodec.encode(state.pushedVideoTrack) : undefined,
      audio: state.pushedAudioTrack ? TrackNameCodec.encode(state.pushedAudioTrack) : undefined,
      screenshare: state.pushedScreenshareTrack ? TrackNameCodec.encode(state.pushedScreenshareTrack) : undefined,
      videoEnabled: state.videoEnabled,
      audioEnabled: state.audioEnabled,
      screenshareEnabled: state.screenshareEnabled,
    });

    void this._transcriptionManager.setAudioTrack(state.audioTrack);
    this._swarmSynchronizer.setSpeaking(this._mediaManager.isSpeaking ?? false);
    this._transcriptionManager.setRecording(this._mediaManager.isSpeaking ?? false);

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
