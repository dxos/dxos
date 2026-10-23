//
// Copyright 2025 DXOS.org
//

import type * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import type * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Atom from 'effect/reactivity/Atom';
import type * as Registry from 'effect/reactivity/AtomRegistry';

import { Event, synchronized } from '@dxos/async';
import { type Client } from '@dxos/client';
import { Resource } from '@dxos/context';
import { Database, Feed, Obj } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { type Identity } from '@dxos/halo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type ContentBlock, Message } from '@dxos/types';
import { isNonNullable } from '@dxos/util';

import {
  CallSimulation,
  type SimulatedAvatarRenderer,
  type SimulatedParticipantProps,
  type SimulatedUtterance,
} from './call-simulation.ts';
import { type CallState, CallSwarmSynchronizer } from './call-swarm-synchronizer.ts';
import { type RoomJoiner, createEdgeRoomJoiner } from './edge-room-joiner.ts';
import { MediaManager, type MediaState } from './media-manager.ts';
import { type TranscriptEvent } from './media-transport.ts';
import {
  type RealtimeKitMeetingFactory,
  RealtimeKitTransport,
  createRealtimeKitMeetingFactory,
} from './realtime-kit-transport.ts';
import { type ActivityState, type EncodedTrackName, TrackNameCodec, type UserState } from './types.ts';

export type GlobalState = {
  call: CallState;
  media: MediaState;
};

export type CallManagerOptions = {
  /** Overrides the RealtimeKit meeting factory (tests and stories); defaults to the real SDK binding. */
  createMeeting?: RealtimeKitMeetingFactory;
  /** Overrides how a room is joined on EDGE; defaults to the client's EDGE HTTP client. */
  roomJoiner?: RoomJoiner;
};

/**
 * Enriches a transcript message before it is written to the feed (e.g. entity linking), injected by the meeting
 * wiring so the calls layer stays agnostic of how enrichment works.
 */
export type TranscriptMessageEnricher = (message: Message.Message) => Promise<Message.Message>;

/**
 * Top level manager for call state.
 */
export class CallManager extends Resource {
  public readonly callStateUpdated = new Event<CallState>();
  // TODO(wittjosiah): Consolidate isSpeaking into the MediaState type.
  public readonly mediaStateUpdated = new Event<[MediaState, boolean]>();
  public readonly roomJoined = new Event<{ roomId?: string }>();
  public readonly left = new Event<string>();
  /** Each scripted line of a simulated call as it starts playing (see `simulate`). */
  public readonly simulatedUtterance = new Event<SimulatedUtterance>();

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
  // Owned by the manager rather than derived from swarm or media state, since it gates the transcript sink.
  private readonly _transcriptionEnabledAtom = Atom.make(false);
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
      .map((user: UserState) => (user.tracks?.audioEnabled ? user.tracks?.audio : undefined))
      .filter(isNonNullable)
      .map((track: string) => state.media.pulledAudioTracks[track as EncodedTrackName])
      .filter(isNonNullable);
  });
  private readonly _videoStreamAtomFamily = Atom.family<EncodedTrackName, Atom.Atom<MediaStream | undefined>>((name) =>
    Atom.make((get) => get(this._stateAtom).media.pulledVideoStreams[name]),
  );
  private readonly _activityAtomFamily = Atom.family<string, Atom.Atom<ActivityState | undefined>>((key) =>
    Atom.make((get) => get(this._stateAtom).call.activities?.[key]),
  );

  #transcriptUnsubscribe?: () => void;
  // Bumped by every `join()` and `leave()`; a join holding a stale generation was superseded and must not finalize.
  #joinGeneration = 0;
  // The feed this client's own native transcript segments are appended to, bound by the meeting wiring.
  #transcriptFeed?: Feed.Feed = undefined;
  #transcriptFeedServiceLayer?: Layer.Layer<Database.Service> = undefined;
  #transcriptEnricher?: TranscriptMessageEnricher = undefined;

  private readonly _swarmSynchronizer: CallSwarmSynchronizer;
  private readonly _mediaManager: MediaManager;
  private readonly _roomJoiner: RoomJoiner;
  private readonly _createMeeting: RealtimeKitMeetingFactory;

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

  /** Transcription on/off for the current call; drives the toolbar toggle and gates the transcript sink. */
  get transcriptionEnabledAtom(): Atom.Atom<boolean> {
    return this._transcriptionEnabledAtom;
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

  /** Returns a derived atom for a pulled video stream by name; returns a no-op atom when name is undefined. */
  videoStreamAtom(name: EncodedTrackName | undefined): Atom.Atom<MediaStream | undefined> {
    return name !== undefined ? this._videoStreamAtomFamily(name) : this._noStreamAtom;
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

  constructor(
    private readonly _client: Client,
    private readonly _registry: Registry.AtomRegistry,
    private readonly _haloIdentity: Context.Service.Shape<typeof Identity.Service>,
    options: CallManagerOptions = {},
  ) {
    super();
    this._client.config.getOrThrow('runtime.services.edge.url');
    const networkService = this._client.services.services.NetworkService;
    invariant(networkService, 'network service not found');
    this._swarmSynchronizer = new CallSwarmSynchronizer({ networkService });
    this._mediaManager = new MediaManager();
    this._roomJoiner = options.roomJoiner ?? createEdgeRoomJoiner(this._client.edge.http);
    this._createMeeting = options.createMeeting ?? createRealtimeKitMeetingFactory();
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

    // Validated before the optimistic flip so a missing room or device cannot leave us marked joined.
    const roomId = this._swarmSynchronizer._getState().roomId;
    const deviceKey = this._haloIdentity.getDevicesSnapshot().find((device) => device.current)?.key;
    invariant(roomId && deviceKey, 'room id and device key are required to join a call');

    const generation = ++this.#joinGeneration;
    this._swarmSynchronizer.setJoined(true);
    try {
      await this._runJoin(generation, roomId, deviceKey);
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
  private async _runJoin(generation: number, roomId: string, deviceKey: string): Promise<void> {
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
    const meetingId = await this._swarmSynchronizer.resolveMeetingId(roomId);
    if (generation !== this.#joinGeneration) {
      return;
    }

    const transport = new RealtimeKitTransport({
      roomId,
      deviceKey,
      meetingId,
      joiner: this._roomJoiner,
      createMeeting: this._createMeeting,
      // Advertised before the slow SFU connect so a concurrent joiner converges on this meeting, and never for a
      // superseded join, whose meeting nobody will attend.
      onMeetingResolved: (id) => {
        if (generation === this.#joinGeneration) {
          this._swarmSynchronizer.advertiseMeetingId(id);
        }
      },
    });
    await this._mediaManager.join(transport);

    // A leave during the SFU connect: the pending `_teardown` releases the transport; emitting would resurrect the call.
    if (generation !== this.#joinGeneration) {
      return;
    }

    // Native transcription reaches every participant, so each persists only its own segments.
    this.#transcriptUnsubscribe = transport.subscribeTranscripts?.((event) => {
      if (event.deviceKey === deviceKey) {
        void this.#writeTranscript(event).catch((error) => log.catch(error));
      }
    });

    this.roomJoined.emit({ roomId });
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
    this.#transcriptUnsubscribe?.();
    this.#transcriptUnsubscribe = undefined;
    this.#transcriptFeed = undefined;
    this.#transcriptFeedServiceLayer = undefined;
    this.#transcriptEnricher = undefined;
    this._registry.set(this._transcriptionEnabledAtom, false);
    // The `joined` flag is left alone: it belongs to the optimistic `join()`/`leave()`, and a queued teardown must
    // not flip a superseding join back to the lobby.
    await this._swarmSynchronizer.leave();
    await this._mediaManager.leave();
    const roomId = this._registry.get(this._roomIdAtom);
    roomId && this.left.emit(roomId);
  }

  /** Binds the feed this call's own native transcript segments are appended to. */
  setTranscriptFeed(db: Database.Database, feed: Feed.Feed): void {
    this.#transcriptFeed = feed;
    this.#transcriptFeedServiceLayer = Database.layer(db);
  }

  /** Toggles whether native transcript segments are persisted to the bound feed. */
  setTranscriptionEnabled(enabled: boolean): void {
    this._registry.set(this._transcriptionEnabledAtom, enabled);
  }

  /** Sets the enricher (e.g. entity linking) applied to each segment before it is appended. */
  setTranscriptEnricher(enricher?: TranscriptMessageEnricher): void {
    this.#transcriptEnricher = enricher;
  }

  async #writeTranscript(event: TranscriptEvent): Promise<void> {
    const feed = this.#transcriptFeed;
    const layer = this.#transcriptFeedServiceLayer;
    if (!this._registry.get(this._transcriptionEnabledAtom) || !feed || !layer) {
      return;
    }

    const block: ContentBlock.Transcript = {
      _tag: 'transcript',
      started: event.started ?? new Date().toISOString(),
      text: event.text,
      pending: event.pending,
    };
    let message = Obj.make(Message.Message, {
      created: new Date().toISOString(),
      blocks: [block],
      sender: { identityDid: Option.getOrUndefined(this._haloIdentity.getSnapshot())?.did },
    });
    if (this.#transcriptEnricher) {
      message = await this.#transcriptEnricher(message);
    }

    await Feed.append(feed, [message]).pipe(Effect.provide(layer), EffectEx.runAndForwardErrors);
  }

  private _onCallStateUpdated(state: CallState): void {
    // Remote tracks follow the transport's roster (see `MediaManager`); the swarm stays the source of presence.
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
