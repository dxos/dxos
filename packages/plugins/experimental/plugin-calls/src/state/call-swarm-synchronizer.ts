//
// Copyright 2025 DXOS.org
//

import { DeferredTask, Event } from '@dxos/async';
import { type Identity } from '@dxos/client/halo';
import { type Stream } from '@dxos/codec-protobuf';
import { Resource } from '@dxos/context';
import { generateName } from '@dxos/display-name';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { buf } from '@dxos/protocols/buf';
import { TranscriptionSchema } from '@dxos/protocols/buf/dxos/edge/calls_pb';
import { type Device, type NetworkService } from '@dxos/protocols/proto/dxos/client/services';
import { type SwarmResponse } from '@dxos/protocols/proto/dxos/edge/messenger';
import { isNonNullable } from '@dxos/util';

import { codec, type TranscriptionState, type EncodedTrackName, type UserState } from '../types';

export type CallState = {
  /**
   * All users states in the swarm.
   */
  users?: UserState[];
  /**
   * Self state inside swarm.
   */
  self?: UserState;

  /**
   * Swarm synchronized CRDT transcription. Last write wins.
   */
  transcription?: TranscriptionState;

  raisedHand?: boolean;
  speaking?: boolean;
  joined?: boolean;

  /**
   * Tracks pushed by self to calls service.
   */
  tracks?: {
    screenshare?: EncodedTrackName;
    video?: EncodedTrackName;
    audio?: EncodedTrackName;
  };
};

export type CallSwarmSynchronizerParams = { networkService: NetworkService };

/**
 * Sends and receives state to/from Swarm network.
 */
export class CallSwarmSynchronizer extends Resource {
  public readonly stateUpdated = new Event<CallState>();

  private readonly _state: CallState = { transcription: { enabled: false, lamportTimestamp: { id: '', version: 0 } } };
  private readonly _networkService: NetworkService;

  private _identityKey?: string = undefined;
  private _deviceKey?: string = undefined;
  private _displayName?: string = undefined;

  private _stream?: Stream<SwarmResponse> = undefined;
  private _roomId?: PublicKey = undefined;
  private _sendStateTask?: DeferredTask = undefined;

  constructor({ networkService }: CallSwarmSynchronizerParams) {
    super();
    this._networkService = networkService;
  }

  /**
   * @internal
   */
  _getState() {
    return this._state;
  }

  setRaisedHand(raisedHand: boolean) {
    if (this._state.raisedHand === raisedHand) {
      return;
    }

    this._state.raisedHand = raisedHand;
    this._notifyAndSchedule();
  }

  setSpeaking(speaking: boolean) {
    if (this._state.speaking === speaking) {
      return;
    }

    this._state.speaking = speaking;
    this._notifyAndSchedule();
  }

  setJoined(joined: boolean) {
    if (this._state.joined === joined) {
      return;
    }

    this._state.joined = joined;
    this._notifyAndSchedule();
  }

  setTracks(tracks: { screenshare?: EncodedTrackName; video?: EncodedTrackName; audio?: EncodedTrackName }) {
    if (
      tracks.video === this._state.tracks?.video &&
      tracks.audio === this._state.tracks?.audio &&
      tracks.screenshare === this._state.tracks?.screenshare
    ) {
      return;
    }

    this._state.tracks = { ...this._state.tracks, ...tracks };
    this._notifyAndSchedule();
  }

  setTranscription(transcription: TranscriptionState) {
    const currentTranscription = this._state.transcription;
    this._state.transcription = {
      ...currentTranscription,
      ...transcription,
      lamportTimestamp: LamportTimestampCrdt.increment(currentTranscription?.lamportTimestamp ?? {}) as any,
    };
    this._notifyAndSchedule();
  }

  /**
   * @internal
   */
  _setIdentity(identity: Identity) {
    this._identityKey = identity.identityKey.toHex();
    this._displayName = identity.profile?.displayName ?? generateName(identity.identityKey.toHex());
  }

  /**
   * @internal
   */
  _setDevice(device: Device) {
    this._deviceKey = device.deviceKey.toHex();
    this._state.transcription!.lamportTimestamp!.id = this._deviceKey;
  }

  /**
   * @internal
   */
  _setRoomId(roomId?: PublicKey) {
    this._roomId = roomId;
  }

  async join() {
    invariant(this._roomId);
    this._stream = this._networkService.subscribeSwarmState({ topic: this._roomId });
    this._stream.subscribe((event) => this._processSwarmEvent(event));

    this._sendStateTask = new DeferredTask(this._ctx, async () => {
      await this._sendState();
    });
    this._notifyAndSchedule();
  }

  async leave() {
    this._sendStateTask = undefined;
    void this._stream?.close();
    this._stream = undefined;
    if (this._roomId && this._identityKey && this._deviceKey) {
      void this._networkService.leaveSwarm({
        topic: this._roomId,
        peer: { identityKey: this._identityKey, peerKey: this._deviceKey },
      });
    }
    this._state.users = undefined;
    this._state.self = undefined;
  }

  /**
   * Notify and schedule send state task.
   */
  private _notifyAndSchedule() {
    if (!this._state.joined) {
      return;
    }

    this.stateUpdated.emit(this._state);
    this._sendStateTask?.schedule();
  }

  private async _sendState() {
    if (!this._roomId || !this._identityKey || !this._deviceKey) {
      return;
    }

    const state: UserState = {
      ...this._state,
      id: this._deviceKey,
      name: this._displayName,
      transcription: buf.create(TranscriptionSchema, this._state.transcription),
    };

    await this._networkService.joinSwarm({
      topic: this._roomId,
      peer: {
        identityKey: this._identityKey,
        peerKey: this._deviceKey,
        state: codec.encode(state),
      },
    });
  }

  private _processSwarmEvent(swarmEvent: SwarmResponse) {
    const users = swarmEvent.peers?.map((peer) => codec.decode(peer.state!)) ?? [];
    this._state.users = users;
    this._state.self = users.find((user) => user.id === this._deviceKey);
    if (users.length === 0) {
      return;
    }

    const lastTranscription = LamportTimestampCrdt.getLastState(
      users.map((user) => user.transcription).filter(isNonNullable),
    );
    if (lastTranscription.lamportTimestamp!.version! > (this._state.transcription?.lamportTimestamp?.version ?? 0)) {
      this._state.transcription = lastTranscription;
    }

    this.stateUpdated.emit(this._state);
  }
}

type LamportTimestamp = TranscriptionState['lamportTimestamp'];

class LamportTimestampCrdt {
  static getLastState<T extends { lamportTimestamp?: LamportTimestamp }>(states: T[]): T {
    const maxTimestamp = Math.max(...states.map((state) => state.lamportTimestamp?.version ?? 0));
    const sortedStates = states
      .filter(
        (state) =>
          state.lamportTimestamp && state.lamportTimestamp.version === maxTimestamp && state.lamportTimestamp.id,
      )
      .sort((a, b) => a.lamportTimestamp!.id!.localeCompare(b.lamportTimestamp!.id!));
    invariant(sortedStates.length > 0, 'No states found');
    return sortedStates[0];
  }

  static increment(timestamp: LamportTimestamp): LamportTimestamp {
    return {
      ...(timestamp ?? {}),
      version: (timestamp?.version ?? 0) + 1,
    };
  }
}
