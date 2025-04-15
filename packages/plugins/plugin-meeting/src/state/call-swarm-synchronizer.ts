//
// Copyright 2025 DXOS.org
//

import md5Hex from 'md5-hex';

import { DeferredTask, Event, synchronized } from '@dxos/async';
import { type Identity } from '@dxos/client/halo';
import { type Stream } from '@dxos/codec-protobuf';
import { Resource } from '@dxos/context';
import { generateName } from '@dxos/display-name';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { buf } from '@dxos/protocols/buf';
import { ActivitySchema } from '@dxos/protocols/buf/dxos/edge/calls_pb';
import { type Device, type NetworkService } from '@dxos/protocols/proto/dxos/client/services';
import { type SwarmResponse } from '@dxos/protocols/proto/dxos/edge/messenger';
import { isNonNullable } from '@dxos/util';

import { codec, type ActivityState, type UserState } from '../types';

export type CallState = {
  /**
   * Room id.
   */
  roomId?: string;

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
  activities?: Record<string, ActivityState>;

  raisedHand?: boolean;
  speaking?: boolean;
  joined?: boolean;

  /**
   * Tracks pushed by self to calls service.
   */
  tracks?: UserState['tracks'];
};

export type CallSwarmSynchronizerParams = { networkService: NetworkService };

/**
 * Sends and receives state to/from Swarm network.
 */
export class CallSwarmSynchronizer extends Resource {
  public readonly stateUpdated = new Event<CallState>();

  private readonly _state: CallState = { activities: {} };
  private readonly _networkService: NetworkService;

  private _identityKey?: string = undefined;
  private _deviceKey?: string = undefined;
  private _displayName?: string = undefined;

  private _stream?: Stream<SwarmResponse> = undefined;
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

  setTracks(tracks: UserState['tracks']) {
    this._state.tracks = { ...this._state.tracks, ...tracks };
    this._notifyAndSchedule();
  }

  setActivity(key: string, payload: ActivityState['payload']) {
    const lamportTimestamp = LamportTimestampCrdt.increment(
      this._state.activities?.[key]?.lamportTimestamp ?? { id: this._deviceKey },
    );
    this._state.activities![key] = { lamportTimestamp, payload };

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
  }

  /**
   * @internal
   */
  _setRoomId(roomId?: string) {
    if (this._stream) {
      log.verbose('joined to a different room', { roomId });
      return;
    }

    this._state.roomId = roomId;
  }

  protected override async _open() {
    this._sendStateTask = new DeferredTask(this._ctx, async () => {
      await this._sendState();
    });
  }

  protected override async _close() {
    this._sendStateTask = undefined;
  }

  @synchronized
  async join() {
    invariant(this._state.roomId);
    this._stream = this._networkService.subscribeSwarmState({ topic: getTopic(this._state.roomId) });
    this._stream.subscribe((event) => this._processSwarmEvent(event));

    this._notifyAndSchedule();
  }

  @synchronized
  async leave() {
    const roomId = this._state.roomId;
    void this._stream?.close();
    this._stream = undefined;
    if (roomId && this._identityKey && this._deviceKey) {
      void this._networkService.leaveSwarm({
        topic: getTopic(roomId),
        peer: { identityKey: this._identityKey, peerKey: this._deviceKey },
      });
    }
    this._state.users = undefined;
    this._state.self = undefined;
  }

  async querySwarm(roomId: string) {
    const topic = getTopic(roomId);
    const swarm = await this._networkService.querySwarm({ topic });
    return swarm.peers ?? [];
  }

  /**
   * Notify and schedule send state task.
   */
  private _notifyAndSchedule() {
    this.stateUpdated.emit(this._state);
    if (this._state.joined) {
      this._sendStateTask?.schedule();
    }
  }

  private async _sendState() {
    if (!this._state.roomId || !this._identityKey || !this._deviceKey) {
      return;
    }

    const state: UserState = {
      ...this._state,
      id: this._deviceKey,
      name: this._displayName,
      activities: this._state.activities
        ? Object.fromEntries(
            Object.entries(this._state.activities).map(([key, activity]) => [
              key,
              buf.create(ActivitySchema, activity),
            ]),
          )
        : {},
    };

    await this._networkService.joinSwarm({
      topic: getTopic(this._state.roomId),
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

    const activityKeys = new Set<string>(users.flatMap((user) => Object.keys(user.activities)));
    [...activityKeys].forEach((key) => {
      const activities = users.map((user) => user.activities?.[key]).filter(isNonNullable);
      const lastActivity = LamportTimestampCrdt.getLastState(activities);
      if (
        lastActivity &&
        lastActivity.lamportTimestamp!.version! > (this._state.activities![key]?.lamportTimestamp?.version ?? 0)
      ) {
        this._state.activities![key] = lastActivity;
      }
    });

    this.stateUpdated.emit(this._state);
  }
}

type LamportTimestamp = ActivityState['lamportTimestamp'];

// TODO(mykola): Factor out.
class LamportTimestampCrdt {
  static getLastState<T extends { lamportTimestamp?: LamportTimestamp }>(states: T[]): T | undefined {
    const maxTimestamp = Math.max(...states.map((state) => state.lamportTimestamp?.version ?? 0));
    const sortedStates = states
      .filter(
        (state) =>
          state.lamportTimestamp && state.lamportTimestamp.version === maxTimestamp && state.lamportTimestamp.id,
      )
      .sort((a, b) => a.lamportTimestamp!.id!.localeCompare(b.lamportTimestamp!.id!));
    return sortedStates[0];
  }

  static increment(timestamp: LamportTimestamp): LamportTimestamp {
    return {
      ...(timestamp ?? {}),
      version: (timestamp?.version ?? 0) + 1,
    };
  }
}

// TODO(mykola): Delete once we refactor swarm to accept string as topic.
const getTopic = (roomId: string): PublicKey => PublicKey.fromHex(md5Hex(roomId));
