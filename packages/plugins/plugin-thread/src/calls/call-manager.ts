//
// Copyright 2025 DXOS.org
//

import { computed } from '@preact/signals-core';

import { Event, synchronized } from '@dxos/async';
import { type Client } from '@dxos/client';
import { Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { live } from '@dxos/live-object';
import { type Tracks } from '@dxos/protocols/proto/dxos/edge/calls';
import { isNonNullable } from '@dxos/util';

import { CallSwarmSynchronizer, type CallState } from './call-swarm-synchronizer';
import { MediaManager, type MediaState } from './media-manager';
import { type ActivityState, CALLS_URL, type EncodedTrackName, TrackNameCodec, type UserState } from './types';

export type GlobalState = {
  call: CallState;
  media: MediaState;
};

/**
 * Top level manager for call state.
 */
export class CallManager extends Resource {
  public readonly callStateUpdated = new Event<CallState>();
  // TODO(wittjosiah): Consolidate isSpeaking into the MediaState type.
  public readonly mediaStateUpdated = new Event<[MediaState, boolean]>();
  public readonly left = new Event<string>();

  /**
   * Live object state. Is changed on internal events.
   * CAUTION: Do not change directly.
   */
  private readonly _state = live<GlobalState>({
    call: {},
    media: { pulledAudioTracks: {}, pulledVideoStreams: {} },
  });

  // TODO(wittjosiah): This shouldn't be necessary, live-object's signals should be granular.
  private readonly _raisedHandSignal = computed(() => this._state.call.raisedHand ?? false);
  private readonly _speakingSignal = computed(() => this._state.call.speaking ?? false);
  private readonly _joinedSignal = computed(() => this._state.call.joined ?? false);

  private readonly _swarmSynchronizer: CallSwarmSynchronizer;
  private readonly _mediaManager: MediaManager;

  /** @reactive */
  get roomId(): string | undefined {
    return this._state.call.roomId;
  }

  /** @reactive */
  get raisedHand(): boolean {
    return this._raisedHandSignal.value;
  }

  /** @reactive */
  get speaking(): boolean {
    return this._speakingSignal.value;
  }

  /** @reactive */
  get joined(): boolean {
    return this._joinedSignal.value;
  }

  /** @reactive */
  get self(): UserState {
    return this._state.call.self ?? {};
  }

  /** @reactive */
  get tracks(): Tracks {
    return this._state.call.tracks ?? {};
  }

  /** @reactive */
  get users(): UserState[] {
    return this._state.call.users ?? [];
  }

  /** @reactive */
  get media() {
    return this._state.media;
  }

  /** @reactive */
  get audioTracksToPlay(): MediaStreamTrack[] {
    return (this._state.call.users ?? [])
      .map((user) => (user.tracks?.audioEnabled ? user.tracks?.audio : undefined))
      .filter(isNonNullable)
      .map((track) => this._state.media.pulledAudioTracks[track as EncodedTrackName]?.track)
      .filter(isNonNullable);
  }

  /** @reactive */
  get state() {
    return this._state;
  }

  /** @reactive */
  getVideoStream(name?: EncodedTrackName): MediaStream | undefined {
    return name ? this._state.media.pulledVideoStreams[name]?.stream : undefined;
  }

  /** @reactive */
  getActivity(key: string): ActivityState | undefined {
    return this._state.call.activities?.[key];
  }

  setRoomId(roomId: string): void {
    this._swarmSynchronizer._setRoomId(roomId);
  }

  setSpeaking(speaking: boolean): void {
    this._swarmSynchronizer.setSpeaking(speaking);
  }

  setRaisedHand(raisedHand: boolean): void {
    this._swarmSynchronizer.setRaisedHand(raisedHand);
  }

  setActivity(key: string, payload: ActivityState['payload']): void {
    this._swarmSynchronizer.setActivity(key, payload);
  }

  turnAudioOn(): Promise<void> {
    return this._mediaManager.turnAudioOn();
  }

  turnAudioOff(): Promise<void> {
    return this._mediaManager.turnAudioOff();
  }

  turnVideoOn(): Promise<void> {
    return this._mediaManager.turnVideoOn();
  }

  turnVideoOff(): Promise<void> {
    return this._mediaManager.turnVideoOff();
  }

  turnScreenshareOn(): Promise<void> {
    return this._mediaManager.turnScreenshareOn();
  }

  turnScreenshareOff(): Promise<void> {
    return this._mediaManager.turnScreenshareOff();
  }

  // TODO(burdon): Can this be mocked?
  constructor(private readonly _client: Client) {
    super();
    this._client.config.getOrThrow('runtime.services.edge.url');
    const networkService = this._client.services.services.NetworkService;
    invariant(networkService, 'network service not found');
    this._swarmSynchronizer = new CallSwarmSynchronizer({ networkService });
    this._mediaManager = new MediaManager();
  }

  protected override async _open(): Promise<void> {
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
    this._ctx.onDispose(() => subscription.unsubscribe());

    this._swarmSynchronizer.stateUpdated.on(this._ctx, (state) => this._onCallStateUpdated(state));
    this._mediaManager.stateUpdated.on(this._ctx, (state) => this._onMediaStateUpdated(state));
  }

  protected override async _close(): Promise<void> {
    await this._swarmSynchronizer.leave();
    await this._swarmSynchronizer.close();
    await this._mediaManager.close();
  }

  async peek(roomId: string): Promise<number> {
    const peers = await this._swarmSynchronizer.querySwarm(roomId);
    return peers.length;
  }

  // TODO(mykola): Reconcile with _swarmSynchronizer.state.joined.
  @synchronized
  async join(): Promise<void> {
    this._swarmSynchronizer.setJoined(true);
    await this._swarmSynchronizer.join();
    await this._mediaManager.join({
      iceServers: this._client.config.get('runtime.services.ice'),
      apiBase: `${CALLS_URL}/api/calls`,
    });
  }

  @synchronized
  async leave(): Promise<void> {
    this._swarmSynchronizer.setJoined(false);
    await this._swarmSynchronizer.leave();
    await this._mediaManager.leave();
    this.roomId && this.left.emit(this.roomId);
  }

  private _onCallStateUpdated(state: CallState): void {
    const tracksToPull = state.users
      ?.filter((user) => user.joined && user.id !== state.self?.id)
      ?.flatMap((user) => [user.tracks?.video, user.tracks?.audio, user.tracks?.screenshare])
      .filter(isNonNullable);
    this._mediaManager._schedulePullTracks(tracksToPull as EncodedTrackName[]);

    this.callStateUpdated.emit(state);
    this._updateState();
  }

  private _onMediaStateUpdated(state: MediaState): void {
    this._swarmSynchronizer.setTracks({
      video: state.pushedVideoTrack ? TrackNameCodec.encode(state.pushedVideoTrack) : undefined,
      audio: state.pushedAudioTrack ? TrackNameCodec.encode(state.pushedAudioTrack) : undefined,
      screenshare: state.pushedScreenshareTrack ? TrackNameCodec.encode(state.pushedScreenshareTrack) : undefined,
      videoEnabled: state.videoEnabled,
      audioEnabled: state.audioEnabled,
      screenshareEnabled: state.screenshareEnabled,
    });

    const isSpeaking = this._mediaManager.isSpeaking ?? false;
    this._swarmSynchronizer.setSpeaking(isSpeaking);

    this.mediaStateUpdated.emit([state, isSpeaking]);
    this._updateState();
  }

  /**
   * Only this method is allowed to change state.
   */
  private _updateState(): void {
    this._state.call = this._swarmSynchronizer._getState();
    this._state.media = this._mediaManager._getState();
  }
}
