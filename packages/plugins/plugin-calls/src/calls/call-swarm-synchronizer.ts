//
// Copyright 2025 DXOS.org
//

import md5Hex from 'md5-hex';

import { DeferredTask, Event, scheduleTask, sleep, synchronized } from '@dxos/async';
import { type ClientServices } from '@dxos/client-protocol';
import { Context, Resource } from '@dxos/context';
import { generateName } from '@dxos/display-name';
import { type Identity } from '@dxos/halo';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { buf, fromPublicKey } from '@dxos/protocols/buf';
import { ActivitySchema } from '@dxos/protocols/buf/dxos/edge/calls_pb';
import { ConnectionState, PeerSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { type SwarmResponse } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { JoinRequestSchema, LeaveRequestSchema, QueryRequestSchema } from '@dxos/protocols/buf/dxos/edge/signal_pb';
import { isNonNullable } from '@dxos/util';

import { type ActivityState, type UserState, codec } from './types.ts';

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

/** The swarm verbs the synchronizer uses. */
export type CallNetworkService = Pick<
  ClientServices['NetworkService'],
  'joinSwarm' | 'leaveSwarm' | 'querySwarm' | 'subscribeSwarmState'
>;

export type CallSwarmSynchronizerProps = { networkService: CallNetworkService };

/**
 * Period for peer to reconnect to the call swarm gracefully if connection was lost abruptly.
 */
const DISCONNECTED_ABRUPT_TIMEOUT = 10_000; // [ms]

/**
 * Swarm activity key under which the room's RealtimeKit meeting id is advertised. The first joiner mints
 * the meeting and advertises it here (last write wins); late joiners read it to share one session.
 */
export const MEETING_ACTIVITY_KEY = 'org.dxos.plugin.calls.realtimekit-meeting';

/**
 * When another peer is present but has not advertised a meeting id yet (a concurrent first join), poll this
 * many times at this interval before minting our own, so the creator's early advertisement can arrive.
 */
const MEETING_RESOLVE_ATTEMPTS = 6;
const MEETING_RESOLVE_INTERVAL = 400; // [ms]

/**
 * Sends and receives state to/from Swarm network.
 */
export class CallSwarmSynchronizer extends Resource {
  public readonly stateUpdated = new Event<CallState>();

  private readonly _state: CallState = { activities: {} };
  private readonly _networkService: CallNetworkService;
  private _lastSwarmEvent?: SwarmResponse = undefined;
  private _reconcileSwarmStateTask?: DeferredTask = undefined;
  // A single pending inactive-peer re-check (see `_reconcileSwarmState`); reset on `leave()`.
  #inactivePeerRecheckPending = false;

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
      this._state.activities?.[key]?.lamportTimestamp,
      this._deviceKey,
    );
    this._state.activities![key] = { lamportTimestamp, payload };

    this._notifyAndSchedule();
  }

  /**
   * @internal
   */
  _setIdentity(identity: Identity.Info): void {
    this._identityDid = identity.did;
    this._displayName = identity.displayName ?? generateName(identity.identityKey ?? '');
  }

  /**
   * @internal
   */
  _setDevice(device: Identity.DeviceInfo): void {
    this._deviceKey = device.key;
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
    log('joining swarm', { topic, peer: { identityDid: this._identityDid, peerKey: this._deviceKey } });
    const stream = this._networkService.subscribeSwarmState({ topic });
    stream.subscribe((event) => this._processSwarmEvent(event));

    const cleanup = () => {
      void stream.close();
      if (topic && this._identityDid && this._deviceKey) {
        log('leaving swarm', { topic, peer: { identityDid: this._identityDid, peerKey: this._deviceKey } });
        void this._networkService
          .leaveSwarm(
            buf.create(LeaveRequestSchema, {
              topic: fromPublicKey(topic),
              // DX-1059: `identityDid` is the only identity field senders write.
              peer: buf.create(PeerSchema, { identityDid: this._identityDid, peerKey: this._deviceKey }),
            }),
          )
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
    // Otherwise a rejoin's `resolveMeetingId` could read this device's stale advertisement and reuse a torn-down meeting.
    delete this._state.activities?.[MEETING_ACTIVITY_KEY];
    // The snapshot belongs to the session being left; a straggling reconcile must not repopulate state from it.
    this._lastSwarmEvent = undefined;
    this.#inactivePeerRecheckPending = false;
  }

  async querySwarm(roomId: string) {
    const topic = getTopic(roomId);
    const swarm = await this._networkService.querySwarm(
      buf.create(QueryRequestSchema, { topic: fromPublicKey(topic) }),
    );
    return swarm.peers ?? [];
  }

  /**
   * Resolves the room's RealtimeKit meeting id so all participants share one session: an id a peer already
   * advertised, or `undefined` when this peer should mint one. Polls briefly while other peers are present but
   * none has advertised yet; a lone joiner returns at once.
   */
  async resolveMeetingId(roomId: string): Promise<string | undefined> {
    for (let attempt = 0; attempt < MEETING_RESOLVE_ATTEMPTS; attempt++) {
      const peers = await this.querySwarm(roomId);
      const advertised = this.#readAdvertisedMeetingId(peers);
      if (advertised) {
        return advertised;
      }
      if (peers.every((peer) => peer.peerKey === this._deviceKey)) {
        return undefined;
      }
      await sleep(MEETING_RESOLVE_INTERVAL);
    }
    return undefined;
  }

  /** Advertises the room's RealtimeKit meeting id so late joiners converge on it. */
  advertiseMeetingId(meetingId: string): void {
    this.setActivity(MEETING_ACTIVITY_KEY, { meetingId });
  }

  #readAdvertisedMeetingId(peers: SwarmResponse['peers']): string | undefined {
    for (const peer of peers ?? []) {
      // Our own advertisement is no evidence the meeting still exists: a rejoin could resolve to one we tore down.
      if (!peer.state || peer.peerKey === this._deviceKey) {
        continue;
      }
      try {
        const meetingId = codec.decode(peer.state).activities?.[MEETING_ACTIVITY_KEY]?.payload?.meetingId;
        if (typeof meetingId === 'string' && meetingId.length > 0) {
          return meetingId;
        }
      } catch (err) {
        log.warn('failed to decode peer state', { err });
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

  /**
   * This device's state as other participants see it.
   * @internal
   */
  _getLocalUser(): UserState | undefined {
    if (!this._deviceKey) {
      return undefined;
    }

    return {
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
  }

  private async _sendState(): Promise<void> {
    const state = this._getLocalUser();
    if (!this._state.roomId || !this._identityDid || !state || !this._state.joined) {
      return;
    }

    await this._networkService.joinSwarm(
      buf.create(JoinRequestSchema, {
        topic: fromPublicKey(getTopic(this._state.roomId)),
        peer: buf.create(PeerSchema, {
          // DX-1059: `identityDid` is the only identity field senders write.
          identityDid: this._identityDid,
          peerKey: this._deviceKey,
          state: codec.encode(state),
        }),
      }),
    );
  }

  private _processSwarmEvent(swarmEvent: SwarmResponse): void {
    if (!this._state.joined) {
      return;
    }

    this._lastSwarmEvent = swarmEvent;
    this._reconcileSwarmStateTask!.schedule();
  }

  private async _reconcileSwarmState(): Promise<void> {
    // A reconcile can land after `leave()`; applying its stale snapshot would resurrect the state `leave()` cleared.
    const swarmEvent = this._lastSwarmEvent;
    const swarmCtx = this._swarmCtx;
    if (!swarmEvent || !swarmCtx || !this._state.joined) {
      return;
    }
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

    // Only remote activities are merged: ours are authoritative locally, and a stale echo of our own entry must
    // not re-introduce state we deleted.
    const remoteUsers = users.filter((user) => user.id !== this._deviceKey);
    const activityKeys = new Set<string>(remoteUsers.flatMap((user) => Object.keys(user.activities)));
    [...activityKeys].forEach((key) => {
      const activities = remoteUsers.map((user) => user.activities?.[key]).filter(isNonNullable);
      const lastActivity = LamportTimestampCrdt.getLastState(activities);
      if (
        lastActivity &&
        LamportTimestampCrdt.supersedes(lastActivity.lamportTimestamp, this._state.activities?.[key]?.lamportTimestamp)
      ) {
        this._state.activities![key] = lastActivity;
      }
    });
    this.stateUpdated.emit(this._state);

    // One pending re-check bound to the swarm session drops inactive peers after the grace period; a repeating
    // interval would stack per reconcile and keep firing after the call ends.
    if (!this.#inactivePeerRecheckPending && peers.some((peer) => peer.connectionState !== ConnectionState.CONNECTED)) {
      this.#inactivePeerRecheckPending = true;
      scheduleTask(
        swarmCtx,
        async () => {
          this.#inactivePeerRecheckPending = false;
          this._reconcileSwarmStateTask?.schedule();
        },
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

  /**
   * Total order over activity writes: the higher version wins, and equal versions tie-break on the smallest
   * writer id (as `getLastState` orders), so two peers that wrote the same version concurrently converge.
   */
  static supersedes(candidate: LamportTimestamp | undefined, current: LamportTimestamp | undefined): boolean {
    if (!candidate) {
      return false;
    }
    if (!current) {
      return true;
    }
    const candidateVersion = candidate.version ?? 0;
    const currentVersion = current.version ?? 0;
    if (candidateVersion !== currentVersion) {
      return candidateVersion > currentVersion;
    }
    // The same writer at the same version is its own write echoed back, not a concurrent one.
    if (!candidate.id || !current.id || candidate.id === current.id) {
      return false;
    }
    return candidate.id.localeCompare(current.id) < 0;
  }

  /** The incrementing peer authors the new write, so the id is its own rather than the previous writer's. */
  static increment(timestamp: LamportTimestamp | undefined, writerId: string | undefined): LamportTimestamp {
    return {
      id: writerId,
      version: (timestamp?.version ?? 0) + 1,
    };
  }
}

// TODO(mykola): Delete once we refactor swarm to accept string as topic.
const getTopic = (roomId: string): PublicKey => PublicKey.fromHex(md5Hex(roomId));
