//
// Copyright 2025 DXOS.org
//

import md5Hex from 'md5-hex';

import { DeferredTask, Event, scheduleTaskInterval, sleep, synchronized } from '@dxos/async';
import { type Identity } from '@dxos/client/halo';
import { Context, Resource } from '@dxos/context';
import { generateName } from '@dxos/display-name';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { buf } from '@dxos/protocols/buf';
import { ActivitySchema } from '@dxos/protocols/buf/dxos/edge/calls_pb';
import { type Device, type NetworkService } from '@dxos/protocols/proto/dxos/client/services';
import { ConnectionState, type SwarmResponse } from '@dxos/protocols/proto/dxos/edge/messenger';
import { isNonNullable } from '@dxos/util';

import { type ActivityState, type UserState, codec } from './types';

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

export type CallSwarmSynchronizerProps = { networkService: NetworkService };

/**
 * Period for peer to reconnect to the call swarm gracefully if connection was lost abruptly.
 */
const DISCONNECTED_ABRUPT_TIMEOUT = 10_000; // [ms]

/**
 * Swarm activity key under which the room's RealtimeKit meeting id is advertised. The first joiner mints
 * the meeting and advertises it here (CRDT last-write-wins); late joiners read it to share one session.
 */
const MEETING_ACTIVITY_KEY = 'dxos.org/plugin-calls/realtimekit-meeting';

/**
 * When another peer is present but has not advertised a meeting id yet (concurrent first-join), poll this
 * many times at this interval before minting our own — long enough for the creator's early advertisement
 * to arrive, short enough not to stall a real first joiner materially.
 */
const MEETING_RESOLVE_ATTEMPTS = 6;
const MEETING_RESOLVE_INTERVAL = 400; // [ms]

/**
 * Sends and receives state to/from Swarm network.
 */
export class CallSwarmSynchronizer extends Resource {
  public readonly stateUpdated = new Event<CallState>();

  private readonly _state: CallState = { activities: {} };
  private readonly _networkService: NetworkService;
  private _lastSwarmEvent?: SwarmResponse = undefined;
  private _reconcileSwarmStateTask?: DeferredTask = undefined;

  private _identityKey?: string = undefined;
  private _identityDid?: string = undefined;
  private _deviceKey?: string = undefined;
  private _displayName?: string = undefined;

  private _swarmCtx?: Context = undefined;

  private _sendStateTask?: DeferredTask = undefined;

  constructor({ networkService }: CallSwarmSynchronizerProps) {
    super();
    this._networkService = networkService;
  }

  /**
   * @internal
   */
  _getState(): CallState {
    return this._state;
  }

  setRaisedHand(raisedHand: boolean): void {
    if (this._state.raisedHand === raisedHand) {
      return;
    }

    this._state.raisedHand = raisedHand;
    this._notifyAndSchedule();
  }

  setSpeaking(speaking: boolean): void {
    if (this._state.speaking === speaking) {
      return;
    }

    this._state.speaking = speaking;
    this._notifyAndSchedule();
  }

  setJoined(joined: boolean): void {
    if (this._state.joined === joined) {
      return;
    }

    this._state.joined = joined;
    this._notifyAndSchedule();
  }

  setTracks(tracks: UserState['tracks']): void {
    this._state.tracks = { ...this._state.tracks, ...tracks };
    this._notifyAndSchedule();
  }

  setActivity(key: string, payload: ActivityState['payload']): void {
    const lamportTimestamp = LamportTimestampCrdt.increment(
      this._state.activities?.[key]?.lamportTimestamp ?? { id: this._deviceKey },
    );
    this._state.activities![key] = { lamportTimestamp, payload };

    this._notifyAndSchedule();
  }

  /**
   * @internal
   */
  _setIdentity(identity: Identity): void {
    this._identityKey = identity.identityKey.toHex();
    this._identityDid = identity.did;
    this._displayName = identity.profile?.displayName ?? generateName(identity.identityKey.toHex());
  }

  /**
   * @internal
   */
  _setDevice(device: Device): void {
    this._deviceKey = device.deviceKey.toHex();
  }

  /**
   * @internal
   */
  _setRoomId(roomId?: string): void {
    if (this._swarmCtx) {
      log.verbose('joined to a different room', { roomId });
      return;
    }

    this._state.roomId = roomId;
  }

  protected override async _open(): Promise<void> {
    this._sendStateTask = new DeferredTask(this._ctx, async () => {
      await this._sendState();
    });

    this._reconcileSwarmStateTask = new DeferredTask(this._ctx, async () => {
      await this._reconcileSwarmState();
    });
  }

  protected override async _close(): Promise<void> {
    this._sendStateTask = undefined;
    this._reconcileSwarmStateTask = undefined;
  }

  @synchronized
  async join(): Promise<void> {
    invariant(this._state.roomId);
    invariant(!this._swarmCtx, 'Already joined');

    this._swarmCtx = new Context();
    const topic = getTopic(this._state.roomId);
    log('joining swarm', { topic, peer: { identityKey: this._identityKey, peerKey: this._deviceKey } });
    const stream = this._networkService.subscribeSwarmState({ topic });
    stream.subscribe((event) => this._processSwarmEvent(event));

    const cleanup = () => {
      void stream.close();
      if (topic && this._identityDid && this._deviceKey) {
        // DX-1059: senders write `identityDid` only (see `_sendState`).
        log('leaving swarm', { topic, peer: { identityDid: this._identityDid, peerKey: this._deviceKey } });
        void this._networkService
          .leaveSwarm({
            topic,
            peer: { identityDid: this._identityDid, peerKey: this._deviceKey },
          })
          .catch((err) => log.catch(err));
      }
      window.removeEventListener('beforeunload', cleanup);
    };
    window.addEventListener('beforeunload', cleanup);
    this._swarmCtx.onDispose(cleanup);

    this._notifyAndSchedule();
  }

  @synchronized
  async leave(): Promise<void> {
    if (!this._swarmCtx) {
      return;
    }

    await this._swarmCtx.dispose();
    this._swarmCtx = undefined;

    this._state.users = undefined;
    this._state.self = undefined;
    // Otherwise a rejoin's `resolveMeetingId` can read this device's own stale advertisement (re-sent by
    // `_sendState` before a fresh one is published) and reuse an already-torn-down RealtimeKit meeting.
    delete this._state.activities![MEETING_ACTIVITY_KEY];
  }

  async querySwarm(roomId: string) {
    const topic = getTopic(roomId);
    const swarm = await this._networkService.querySwarm({ topic });
    return swarm.peers ?? [];
  }

  /**
   * Resolve the RealtimeKit meeting id for the room so all participants share one SFU session. Returns an
   * id already advertised by a peer, or `undefined` to signal this peer should mint one. When other peers
   * are present but none has advertised yet (a concurrent first-join), polls briefly to let the creator
   * publish before we mint a competing meeting. A lone joiner returns immediately (no added latency).
   */
  async resolveMeetingId(roomId: string): Promise<string | undefined> {
    for (let attempt = 0; attempt < MEETING_RESOLVE_ATTEMPTS; attempt++) {
      const peers = await this.querySwarm(roomId);
      const advertised = this.#readAdvertisedMeetingId(peers);
      const others = peers.filter((peer) => peer.peerKey !== this._deviceKey).length;
      log.info('resolveMeetingId', { roomId, attempt, others, advertised });
      if (advertised) {
        return advertised;
      }
      if (others === 0) {
        return undefined;
      }
      await sleep(MEETING_RESOLVE_INTERVAL);
    }
    return undefined;
  }

  /** Advertise the room's RealtimeKit meeting id via the swarm so late joiners converge on it. */
  advertiseMeetingId(meetingId: string): void {
    log.info('advertiseMeetingId', { meetingId });
    this.setActivity(MEETING_ACTIVITY_KEY, { meetingId });
  }

  #readAdvertisedMeetingId(peers: SwarmResponse['peers']): string | undefined {
    for (const peer of peers ?? []) {
      // Self's own advertisement is not external confirmation that a meeting exists — reading it back
      // would let a rejoin resolve to a meeting id this same device already tore down.
      if (!peer.state || peer.peerKey === this._deviceKey) {
        continue;
      }
      try {
        const meetingId = codec.decode(peer.state).activities?.[MEETING_ACTIVITY_KEY]?.payload?.meetingId;
        if (typeof meetingId === 'string' && meetingId.length > 0) {
          return meetingId;
        }
      } catch (err) {
        log.warn('failed to decode peer state during meeting id query', { err });
      }
    }
    return undefined;
  }

  /**
   * Notify and schedule send state task.
   */
  private _notifyAndSchedule(): void {
    this.stateUpdated.emit(this._state);
    if (this._state.joined) {
      this._sendStateTask?.schedule();
    }
  }

  private async _sendState(): Promise<void> {
    if (!this._state.roomId || !this._identityKey || !this._identityDid || !this._deviceKey || !this._state.joined) {
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
        // DX-1059: `identityDid` is the only identity field senders write; the edge validates
        // `source.identityDid` and rejects a peer that omits it with `EdgeIdentityChangedError`.
        identityDid: this._identityDid,
        peerKey: this._deviceKey,
        state: codec.encode(state),
      },
    });
  }

  private _processSwarmEvent(swarmEvent: SwarmResponse): void {
    if (!this._state.joined) {
      return;
    }

    this._lastSwarmEvent = swarmEvent;
    this._reconcileSwarmStateTask!.schedule();
  }

  private async _reconcileSwarmState(): Promise<void> {
    const swarmEvent = this._lastSwarmEvent;
    invariant(swarmEvent);
    // We include inactive peers that were disconnected abruptly and have not yet reconnected to not drop them from call.
    // Websocket connection could be unstable and we include graceful period for peers to reconnect.
    const peers = [
      ...(swarmEvent.peers ?? []),
      ...(swarmEvent.inactivePeers ?? []).filter(
        ({ disconnected, connectionState }) =>
          connectionState === ConnectionState.DISCONNECTED_ABRUPT &&
          disconnected &&
          disconnected > Date.now() - DISCONNECTED_ABRUPT_TIMEOUT,
      ),
    ].sort((peer1, peer2) => peer1.peerKey.localeCompare(peer2.peerKey));
    const users = peers
      .map((peer) => {
        try {
          return codec.decode(peer.state!);
        } catch (error) {
          log.error('error decoding peer state', { error, peer });
          return undefined;
        }
      })
      .filter(isNonNullable);
    this._state.users = users;
    this._state.self = users.find((user) => user.id === this._deviceKey);
    log('reconciling swarm state', { users });
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

    // Schedule next reconcile if there are inactive peer to drop them after timeout.
    if (peers.some((peer) => peer.connectionState !== ConnectionState.CONNECTED)) {
      scheduleTaskInterval(
        this._ctx,
        async () => this._reconcileSwarmStateTask!.schedule(),
        Math.min(DISCONNECTED_ABRUPT_TIMEOUT / 2, 1000),
      );
    }
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
