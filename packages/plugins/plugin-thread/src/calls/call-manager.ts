//
// Copyright 2025 DXOS.org
//

import { Atom, type Registry } from '@effect-atom/atom-react';

import { Event, synchronized } from '@dxos/async';
import { type Client } from '@dxos/client';
import { Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { type Tracks } from '@dxos/protocols/buf/dxos/edge/calls_pb';
import { isNonNullable } from '@dxos/util';

import { type CallState, CallSwarmSynchronizer } from './call-swarm-synchronizer';
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
   * Atom-based state. Updated via `_updateState()`.
   * CAUTION: Do not change directly.
   */
  private readonly _stateAtom = Atom.make<GlobalState>({
    call: {},
    media: { pulledAudioTracks: {}, pulledVideoStreams: {} },
  });

  // Derived atoms for reactive subscriptions.
  private readonly _roomIdAtom = Atom.make((get) => get(this._stateAtom).call.roomId);
  private readonly _raisedHandAtom = Atom.make((get) => get(this._stateAtom).call.raisedHand ?? false);
  private readonly _speakingAtom = Atom.make((get) => get(this._stateAtom).call.speaking ?? false);
  private readonly _joinedAtom = Atom.make((get) => get(this._stateAtom).call.joined ?? false);
  private readonly _selfAtom = Atom.make((get) => get(this._stateAtom).call.self ?? {});
  private readonly _tracksAtom = Atom.make((get) => get(this._stateAtom).call.tracks ?? {});
  private readonly _usersAtom = Atom.make((get) => get(this._stateAtom).call.users ?? []);
  private readonly _mediaAtom = Atom.make((get) => get(this._stateAtom).media);
  private readonly _audioTracksToPlayAtom = Atom.make((get) => {
    const state = get(this._stateAtom);
    return (state.call.users ?? [])
      .map((user: UserState) => (user.tracks?.audioEnabled ? user.tracks?.audio : undefined))
      .filter(isNonNullable)
      .map((track: string) => state.media.pulledAudioTracks[track as EncodedTrackName]?.track)
      .filter(isNonNullable);
  });
  private readonly _videoStreamAtomFamily = Atom.family<EncodedTrackName, Atom.Atom<MediaStream | undefined>>((name) =>
    Atom.make((get) => get(this._stateAtom).media.pulledVideoStreams[name]?.stream),
  );
  private readonly _activityAtomFamily = Atom.family<string, Atom.Atom<ActivityState | undefined>>((key) =>
    Atom.make((get) => get(this._stateAtom).call.activities?.[key]),
  );

  private readonly _swarmSynchronizer: CallSwarmSynchronizer;
  private readonly _mediaManager: MediaManager;

  //
  // Derived atoms for reactive UI subscriptions.
  //

  /** Derived atom for roomId. */
  get roomIdAtom(): Atom.Atom<string | undefined> {
    return this._roomIdAtom;
  }

  /** Derived atom for raisedHand. */
  get raisedHandAtom(): Atom.Atom<boolean> {
    return this._raisedHandAtom;
  }

  /** Derived atom for speaking. */
  get speakingAtom(): Atom.Atom<boolean> {
    return this._speakingAtom;
  }

  /** Derived atom for joined. */
  get joinedAtom(): Atom.Atom<boolean> {
    return this._joinedAtom;
  }

  /** Derived atom for self. */
  get selfAtom(): Atom.Atom<UserState> {
    return this._selfAtom;
  }

  /** Derived atom for tracks. */
  get tracksAtom(): Atom.Atom<Tracks> {
    return this._tracksAtom as Atom.Atom<Tracks>;
  }

  /** Derived atom for users. */
  get usersAtom(): Atom.Atom<UserState[]> {
    return this._usersAtom;
  }

  /** Derived atom for media. */
  get mediaAtom(): Atom.Atom<MediaState> {
    return this._mediaAtom;
  }

  /** Derived atom for audioTracksToPlay. */
  get audioTracksToPlayAtom(): Atom.Atom<MediaStreamTrack[]> {
    return this._audioTracksToPlayAtom;
  }

  /** Returns the full state atom for reactive subscriptions. */
  get stateAtom(): Atom.Atom<GlobalState> {
    return this._stateAtom;
  }

  /** Returns a derived atom for a video stream by name. */
  videoStreamAtom(name: EncodedTrackName): Atom.Atom<MediaStream | undefined> {
    return this._videoStreamAtomFamily(name);
  }

  /** Returns a derived atom for an activity by key. */
  activityAtom(key: string): Atom.Atom<ActivityState | undefined> {
    return this._activityAtomFamily(key);
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
  constructor(
    private readonly _client: Client,
    private readonly _registry: Registry.Registry,
  ) {
    super();
    this._client.config.getOrThrow('runtime.services.edge.url');
    const networkService = this._client.services.services.NetworkService;
    invariant(networkService, 'network service not found');
    this._swarmSynchronizer = new CallSwarmSynchronizer({ networkService: networkService as never });
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
    const roomId = this._registry.get(this._roomIdAtom);
    roomId && this.left.emit(roomId);
  }

  private _onCallStateUpdated(state: CallState): void {
    const tracksToPull = state.users
      ?.filter((user) => user.joined && user.id !== state.self!.id)
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
    this._registry.set(this._stateAtom, {
      call: this._swarmSynchronizer._getState(),
      media: this._mediaManager._getState(),
    });
  }
}
