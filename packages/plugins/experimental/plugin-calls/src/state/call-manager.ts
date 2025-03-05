//
// Copyright 2025 DXOS.org
//

import { type PublicKey, type Client } from '@dxos/client';
import { Resource } from '@dxos/context';
import { create } from '@dxos/live-object';

import { CallSwarmSynchronizer, type CallState } from './call-swarm-synchronizer';
import { type TranscriptionState, type EncodedTrackName } from '../types';

export type GlobalState = { call: CallState };

/**
 * Top level manager for call state.
 */
export class CallManager extends Resource {
  /**
   * Live object state. Is changed on internal events.
   * CAUTION: Do not change directly.
   */
  private readonly _state = create<GlobalState>({ call: {} });
  private readonly _swarmSynchronizer: CallSwarmSynchronizer;

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

  set speaking(speaking: boolean) {
    this._swarmSynchronizer.setSpeaking(speaking);
  }

  set raisedHand(raisedHand: boolean) {
    this._swarmSynchronizer.setRaisedHand(raisedHand);
  }

  set joined(joined: boolean) {
    this._swarmSynchronizer.setJoined(joined);
  }

  set tracks(tracks: { screenshare?: EncodedTrackName; video?: EncodedTrackName; audio?: EncodedTrackName }) {
    this._swarmSynchronizer.setTracks(tracks);
  }

  set transcription(transcription: TranscriptionState) {
    this._swarmSynchronizer.setTranscription(transcription);
  }

  constructor(private readonly _client: Client) {
    super();
    this._swarmSynchronizer = new CallSwarmSynchronizer({
      networkService: _client.services.services.NetworkService!,
    });
  }

  protected override async _open() {
    const subscription = this._client.halo.identity.subscribe((identity) => {
      if (identity) {
        this._swarmSynchronizer._setIdentity(identity);
      }
      if (this._client.halo.device) {
        this._swarmSynchronizer._setDevice(this._client.halo.device);
      }
    });
    this._swarmSynchronizer.stateUpdated.on(this._ctx, () => this._updateState());

    this._ctx.onDispose(() => subscription.unsubscribe());
  }

  // TODO(mykola): Reconcile with _swarmSynchronizer.state.joined.
  async join(roomId: PublicKey) {
    this._swarmSynchronizer._setRoomId(roomId);
    await this._swarmSynchronizer.open();
    this._swarmSynchronizer.setJoined(true);
  }

  async leave() {
    this._swarmSynchronizer.setJoined(false);
    await this._swarmSynchronizer.close();
    this._swarmSynchronizer._setRoomId(undefined);
  }

  private _updateState() {
    this._state.call = this._swarmSynchronizer.state;
  }
}
