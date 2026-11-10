//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import * as Atom from 'effect/reactivity/Atom';
import type * as Registry from 'effect/reactivity/AtomRegistry';

import { Event, synchronized } from '@dxos/async';
import { Context, Resource } from '@dxos/context';
import { type Identity } from '@dxos/halo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type ContentBlock } from '@dxos/types';
import { isNonNullable } from '@dxos/util';

import {
  CallSimulation,
  type SimulatedAvatarRenderer,
  type SimulatedParticipantProps,
  type SimulatedUtterance,
} from './call-simulation.ts';
import { type CallNetworkService, type CallState, CallSwarmSynchronizer } from './call-swarm-synchronizer.ts';
import { MediaManager, type MediaState } from './media-manager.ts';
import { type CloseReason, type CreateTransport, type MediaTransport, type TrackKind } from './media-transport.ts';
import { type ActivityState, type RemoteTrackKey, type UserState, remoteTrackKey } from './types.ts';

export type GlobalState = {
  call: CallState;
  media: MediaState;
};

export type CallManagerOptions = {
  registry: Registry.AtomRegistry;
  /** The local HALO identity and its devices; the current device is this participant. */
  identity: Pick<Identity.ServiceApi, 'subscribe' | 'getDevicesSnapshot'>;
  /** Carries presence and the room's shared activities (the meeting id among them) over the swarm. */
  networkService: CallNetworkService;
  /** Builds the media transport for a room: `createRealtimeKitTransport` in the app, `FakeTransport` in tests. */
  createTransport: CreateTransport;
};

/**
 * Top level manager for call state.
 */
export class CallManager extends Resource {
  public readonly callStateUpdated = new Event<CallState>();
  public readonly roomJoined = new Event<{ roomId?: string }>();
  public readonly left = new Event<string>();
  /** Each scripted line of a simulated call as it starts playing (see `simulate`). */
  public readonly simulatedUtterance = new Event<SimulatedUtterance>();
  /** This device's own speech in the live call, transcribed by the transport: final segments only, in spoken order. */
  public readonly transcript = new Event<ContentBlock.Transcript>();

  /**
   * Atom-based state. Updated via `_updateState()`.
   * CAUTION: Do not change directly.
   *
   * Kept alive because it is the manager's own state, read imperatively (`joined`) as well as by the UI: a writable
   * atom nothing subscribes to is dropped by the registry and reads back as its initial value.
   */
  private readonly _stateAtom = Atom.make<GlobalState>({
    call: {},
    media: { pulledAudioTracks: {}, pulledVideoStreams: {} },
  }).pipe(Atom.keepAlive);

  // Derived atoms for reactive subscriptions.
  private readonly _roomIdAtom = Atom.make((get) => get(this._stateAtom).call.roomId);
  private readonly _raisedHandAtom = Atom.make((get) => get(this._stateAtom).call.raisedHand ?? false);
  private readonly _speakingAtom = Atom.make((get) => get(this._stateAtom).call.speaking ?? false);
  private readonly _joinedAtom = Atom.make((get) => get(this._stateAtom).call.joined ?? false);
  private readonly _selfAtom = Atom.make((get) => get(this._stateAtom).call.self ?? {});
  private readonly _tracksAtom = Atom.make((get) => get(this._stateAtom).call.tracks ?? {});
  private readonly _usersAtom = Atom.make((get) => get(this._stateAtom).call.users ?? []);
  private readonly _audioEnabledAtom = Atom.make((get) => get(this._stateAtom).media.audioEnabled ?? false);
  private readonly _videoEnabledAtom = Atom.make((get) => get(this._stateAtom).media.videoEnabled ?? false);
  private readonly _screensharingAtom = Atom.make((get) => get(this._stateAtom).media.screenshareTrack !== undefined);
  private readonly _localVideoStreamAtom = Atom.make((get) => get(this._stateAtom).media.videoStream);
  private readonly _screenshareVideoStreamAtom = Atom.make((get) => get(this._stateAtom).media.screenshareVideoStream);
  private readonly _noStreamAtom = Atom.make<MediaStream | undefined>(() => undefined);
  private readonly _audioTracksToPlayAtom = Atom.make((get) => {
    const state = get(this._stateAtom);
    return (state.call.users ?? [])
      .map((user: UserState) =>
        user.id && user.tracks?.audioEnabled
          ? state.media.pulledAudioTracks[remoteTrackKey(user.id, 'audio')]
          : undefined,
      )
      .filter(isNonNullable);
  });
  private readonly _videoStreamAtomFamily = Atom.family<RemoteTrackKey, Atom.Atom<MediaStream | undefined>>((key) =>
    Atom.make((get) => get(this._stateAtom).media.pulledVideoStreams[key]),
  );
  private readonly _activityAtomFamily = Atom.family<string, Atom.Atom<ActivityState | undefined>>((key) =>
    Atom.make((get) => get(this._stateAtom).call.activities?.[key]),
  );

  // Bumped by every `join()` and `leave()`; a join holding a stale generation was superseded and must not finalize.
  #joinGeneration = 0;
  /** The live call's transport and the context its listeners are bound to, replaced on a meeting switch or rejoin. */
  #transport?: MediaTransport;
  #transportCtx?: Context;
  /** A meeting the swarm agreed on that could not be joined here; not retried on every later state update. */
  #unreachableMeetingId?: string;

  private readonly _swarmSynchronizer: CallSwarmSynchronizer;
  private readonly _mediaManager: MediaManager;
  private readonly _createTransport: CreateTransport;

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

  /** Current joined state (synchronous read for imperative callers, e.g. join-after-leave). */
  get joined(): boolean {
    return this._registry.get(this._joinedAtom);
  }

  /** Derived atom for self. */
  get selfAtom(): Atom.Atom<UserState> {
    return this._selfAtom;
  }

  /** Derived atom for tracks. */
  get tracksAtom(): Atom.Atom<NonNullable<UserState['tracks']>> {
    return this._tracksAtom;
  }

  /** Derived atom for users. */
  get usersAtom(): Atom.Atom<UserState[]> {
    return this._usersAtom;
  }

  /** Derived atom for whether the microphone is enabled. */
  get audioEnabledAtom(): Atom.Atom<boolean> {
    return this._audioEnabledAtom;
  }

  /** Derived atom for whether the camera is enabled. */
  get videoEnabledAtom(): Atom.Atom<boolean> {
    return this._videoEnabledAtom;
  }

  /** Derived atom for whether screen sharing is active. */
  get screensharingAtom(): Atom.Atom<boolean> {
    return this._screensharingAtom;
  }

  /** Derived atom for the local camera video stream. */
  get localVideoStreamAtom(): Atom.Atom<MediaStream | undefined> {
    return this._localVideoStreamAtom;
  }

  /** Derived atom for the local screenshare video stream. */
  get screenshareVideoStreamAtom(): Atom.Atom<MediaStream | undefined> {
    return this._screenshareVideoStreamAtom;
  }

  /** Derived atom for audioTracksToPlay. */
  get audioTracksToPlayAtom(): Atom.Atom<MediaStreamTrack[]> {
    return this._audioTracksToPlayAtom;
  }

  /** Returns the full state atom for reactive subscriptions. */
  get stateAtom(): Atom.Atom<GlobalState> {
    return this._stateAtom;
  }

  /** Returns a derived atom for a participant's camera or screenshare; a no-op atom when there is no participant. */
  videoStreamAtom(
    deviceKey: string | undefined,
    kind: Exclude<TrackKind, 'audio'>,
  ): Atom.Atom<MediaStream | undefined> {
    return deviceKey !== undefined ? this._videoStreamAtomFamily(remoteTrackKey(deviceKey, kind)) : this._noStreamAtom;
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

  private readonly _registry: Registry.AtomRegistry;
  private readonly _haloIdentity: CallManagerOptions['identity'];

  constructor({ registry, identity, networkService, createTransport }: CallManagerOptions) {
    super();
    this._registry = registry;
    this._haloIdentity = identity;
    this._swarmSynchronizer = new CallSwarmSynchronizer({ networkService });
    this._mediaManager = new MediaManager();
    this._createTransport = createTransport;
  }

  protected override async _open(): Promise<void> {
    await this._mediaManager.open();
    await this._swarmSynchronizer.open();
    const unsubscribe = this._haloIdentity.subscribe((identity) => {
      if (Option.isSome(identity)) {
        this._swarmSynchronizer._setIdentity(identity.value);
      }
      const currentDevice = this._haloIdentity.getDevicesSnapshot().find((device) => device.current);
      if (currentDevice) {
        this._swarmSynchronizer._setDevice(currentDevice);
      }
    });
    this._ctx.onDispose(() => unsubscribe());

    this._swarmSynchronizer.stateUpdated.on(this._ctx, (state) => this._onCallStateUpdated(state));
    this._mediaManager.stateUpdated.on(this._ctx, (state) => this._onMediaStateUpdated(state));
  }

  protected override async _close(): Promise<void> {
    await this.#simulation?.close();
    await this._swarmSynchronizer.leave();
    await this._swarmSynchronizer.close();
    await this._mediaManager.close();
  }

  async peek(roomId: string): Promise<number> {
    const peers = await this._swarmSynchronizer.querySwarm(roomId);
    return peers.length;
  }

  /**
   * Test seam: replaces the network with participants played from video files (see `CallSimulation`).
   * While set, `join` stays local — no swarm, no SFU session — so a call renders with no EDGE reachable.
   * Pass `undefined` to remove them. `transcript` lines are emitted on `simulatedUtterance` as they play.
   * `renderAvatar` draws participants with an `avatar`; without it they show their file's picture.
   */
  @synchronized
  async simulate(
    participants: SimulatedParticipantProps[] | undefined,
    transcript?: SimulatedUtterance[],
    renderAvatar?: SimulatedAvatarRenderer,
  ): Promise<void> {
    await this.#simulation?.close();
    this.#simulation = undefined;
    if (participants) {
      const simulation = new CallSimulation(participants, transcript, renderAvatar);
      await simulation.open();
      simulation.changed.on(this._ctx, () => this._updateState());
      simulation.spoke.on(this._ctx, (utterance) => this.simulatedUtterance.emit(utterance));
      this.#simulation = simulation;
    }
    this._updateState();
  }

  // Not `@synchronized`: presence flips to joined at once so the in-call UI shows without waiting for a prior join or
  // a queued teardown to release the lock; `_runJoin` does the serialized work.
  async join(): Promise<void> {
    if (this.#simulation) {
      await this.#simulation.join();
      this._updateState();
      return;
    }

    // A second join would double-join the swarm and its failure rollback would tear down the live call.
    if (this.joined) {
      return;
    }

    // Validated before the optimistic flip so a missing room cannot leave us marked joined.
    const roomId = this._swarmSynchronizer._getState().roomId;
    invariant(roomId, 'room id is required to join a call');

    const generation = ++this.#joinGeneration;
    this._swarmSynchronizer.setJoined(true);
    try {
      await this._runJoin(generation, roomId);
    } catch (error) {
      // Roll back unless a newer join or leave already owns the state.
      if (generation === this.#joinGeneration) {
        this._swarmSynchronizer.setJoined(false);
        try {
          await this._teardown();
        } catch (teardownError) {
          // Best effort: a teardown failure must not mask the join error rethrown below.
          log.catch(teardownError);
        }
      }
      throw error;
    }
  }

  // TODO(mykola): Reconcile with _swarmSynchronizer.state.joined.
  @synchronized
  private async _runJoin(generation: number, roomId: string): Promise<void> {
    if (generation !== this.#joinGeneration) {
      return;
    }

    await this._swarmSynchronizer.join();

    // Bail before opening a RealtimeKit meeting if a leave raced in: back-to-back create and destroy with the same
    // participant id leaves the SFU unable to push or pull. The pending `_teardown` undoes the swarm join.
    if (generation !== this.#joinGeneration) {
      return;
    }

    // Reuse the meeting a peer already advertised, so all participants share one session.
    const advertised = await this._swarmSynchronizer.queryMeetingId(roomId);
    if (generation !== this.#joinGeneration) {
      return;
    }

    await this.#connect(generation, roomId, advertised);
    if (generation !== this.#joinGeneration) {
      return;
    }

    this.roomJoined.emit({ roomId });
  }

  /**
   * Opens a transport for the room's meeting and binds its events; replaces the current one, if any.
   * Runs inside the manager's lock (`_runJoin`, `_switchMeeting`).
   */
  async #connect(generation: number, roomId: string, meetingId: string | undefined): Promise<void> {
    await this.#disconnect();
    const transport = this._createTransport({ roomId, meetingId });
    this.#transport = transport;
    await this._mediaManager.join(transport);

    // A leave during the connect: the pending `_teardown` releases the transport; binding would resurrect the call.
    if (generation !== this.#joinGeneration) {
      return;
    }

    const ctx = new Context();
    this.#transportCtx = ctx;
    transport.transcript.on(ctx, (event) => {
      // Revisions of a segment precede its final text, and a transcript keeps only what was finally said.
      if (!event.pending && event.text.trim().length > 0) {
        this.transcript.emit({ _tag: 'transcript', started: event.started, text: event.text.trim() });
      }
    });
    transport.closed.on(ctx, (reason) => this.#onTransportClosed(generation, roomId, reason));

    // Advertised so a late joiner, or a peer that raced us to an empty room, converges on one meeting.
    if (transport.meetingId && transport.meetingId !== this._swarmSynchronizer.advertisedMeetingId) {
      this._swarmSynchronizer.advertiseMeetingId(transport.meetingId);
    }
  }

  async #disconnect(): Promise<void> {
    await this.#transportCtx?.dispose();
    this.#transportCtx = undefined;
    this.#transport = undefined;
    await this._mediaManager.leave();
  }

  /** RealtimeKit ended the session: leave if the meeting is gone, otherwise reconnect to it. */
  #onTransportClosed(generation: number, roomId: string, reason: CloseReason): void {
    if (generation !== this.#joinGeneration) {
      return;
    }
    log.info('call transport closed', { reason });
    if (reason === 'ended') {
      void this.leave().catch((error) => log.catch(error));
    } else {
      void this._switchMeeting(generation, roomId, this.#transport?.meetingId, { reconnect: true }).catch((error) => {
        log.catch(error);
        void this.leave().catch((leaveError) => log.catch(leaveError));
      });
    }
  }

  /**
   * Moves the live call to `meetingId`: the one the swarm agreed on, or with `reconnect` the same one after a lost
   * connection. Queued switches re-check on entry, so a burst of state updates moves the call once.
   */
  @synchronized
  private async _switchMeeting(
    generation: number,
    roomId: string,
    meetingId: string | undefined,
    { reconnect = false }: { reconnect?: boolean } = {},
  ): Promise<void> {
    if (generation !== this.#joinGeneration || (!reconnect && this.#transport?.meetingId === meetingId)) {
      return;
    }
    log.info('switching call meeting', { from: this.#transport?.meetingId, to: meetingId, reconnect });
    await this.#connect(generation, roomId, meetingId);
  }

  // Not `@synchronized`: presence flips at once so the lobby shows without waiting for an in-flight SFU connect.
  async leave(): Promise<void> {
    this.#simulation?.leave();
    this._swarmSynchronizer.setJoined(false);
    this.#joinGeneration++;
    await this._teardown();
    this._updateState();
  }

  @synchronized
  private async _teardown(): Promise<void> {
    this.#unreachableMeetingId = undefined;
    // The `joined` flag is left alone: it belongs to the optimistic `join()`/`leave()`, and a queued teardown must
    // not flip a superseding join back to the lobby.
    await this._swarmSynchronizer.leave();
    await this.#disconnect();
    const roomId = this._registry.get(this._roomIdAtom);
    roomId && this.left.emit(roomId);
  }

  private _onCallStateUpdated(state: CallState): void {
    // Remote tracks follow the transport's roster (see `MediaManager`); the swarm stays the source of presence.
    this.callStateUpdated.emit(state);
    this._updateState();
    this.#followAgreedMeeting(state);
  }

  /**
   * Two peers that join an empty room together each get a meeting before either sees the other's advertisement.
   * Last write wins across the swarm, so every peer reads the same winner; whoever is elsewhere moves to it.
   */
  #followAgreedMeeting(state: CallState): void {
    const agreed = this._swarmSynchronizer.advertisedMeetingId;
    const current = this.#transport?.meetingId;
    const roomId = state.roomId;
    if (
      !state.joined ||
      !roomId ||
      !agreed ||
      !current ||
      agreed === current ||
      agreed === this.#unreachableMeetingId
    ) {
      return;
    }
    const generation = this.#joinGeneration;
    void this._switchMeeting(generation, roomId, agreed).catch((error) => {
      // Back to the meeting we left, so a meeting we cannot join (gone, or not the room's) does not end the call.
      log.catch(error);
      this.#unreachableMeetingId = agreed;
      void this._switchMeeting(generation, roomId, current, { reconnect: true }).catch((fallbackError) => {
        log.catch(fallbackError);
        void this.leave().catch((leaveError) => log.catch(leaveError));
      });
    });
  }

  private _onMediaStateUpdated(state: MediaState): void {
    this._swarmSynchronizer.setTracks({
      videoEnabled: state.videoEnabled,
      audioEnabled: state.audioEnabled,
      screenshareEnabled: state.screenshareEnabled,
    });

    this._swarmSynchronizer.setSpeaking(this._mediaManager.isSpeaking ?? false);
    this._updateState();
  }

  /**
   * Only this method is allowed to change state.
   */
  private _updateState(): void {
    // Seeded state is authoritative; live swarm/media events must not clobber it.
    if (this.#seeded) {
      return;
    }
    const state = { call: this._swarmSynchronizer._getState(), media: this._mediaManager._getState() };
    this._registry.set(
      this._stateAtom,
      this.#simulation ? this.#simulation.merge(state, this._swarmSynchronizer._getLocalUser()) : state,
    );
  }

  #simulation?: CallSimulation;

  /** Set once a harness seeds state; freezes `_updateState` so deterministic story state survives. */
  #seeded = false;

  /**
   * Seeds runtime call/media state directly, bypassing the swarm and media managers.
   * The participant list and pulled tracks normally originate from live network peers, which have no
   * source in stories and tests; this seam lets a harness present a deterministic call without a swarm.
   */
  _setState(state: GlobalState): void {
    this.#seeded = true;
    this._registry.set(this._stateAtom, state);
  }
}
