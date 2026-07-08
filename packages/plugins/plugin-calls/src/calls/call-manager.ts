//
// Copyright 2025 DXOS.org
//

import { Atom, type Registry } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Event, synchronized } from '@dxos/async';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Resource } from '@dxos/context';
import { Database, Feed, Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type Tracks } from '@dxos/protocols/proto/dxos/edge/calls';
import { type ContentBlock, Message } from '@dxos/types';
import { isNonNullable } from '@dxos/util';

import { type CallState, CallSwarmSynchronizer } from './call-swarm-synchronizer';
import { type RoomJoiner, createEdgeRoomJoiner } from './edge-room-joiner';
import { MediaManager, type MediaState } from './media-manager';
import { type TranscriptEvent } from './media-transport';
import {
  type RealtimeKitMeetingFactory,
  RealtimeKitTransport,
  createRealtimeKitMeetingFactory,
} from './realtime-kit-transport';
import { type ActivityState, type EncodedTrackName, TrackNameCodec, type UserState } from './types';

export type GlobalState = {
  call: CallState;
  media: MediaState;
};

export type CallManagerOptions = {
  /** Overrides the RealtimeKit meeting factory (tests/stories); defaults to the real SDK binding. */
  createMeeting?: RealtimeKitMeetingFactory;
};

/**
 * Enriches a transcript message before it is written to the feed (e.g. entity linking). Injected by the
 * meeting wiring so the calls layer stays agnostic of how enrichment works.
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
  // Transcription on/off for the current call (set via `setTranscriptionEnabled`; surfaced to the toolbar).
  // Owned directly by the manager (not derived from swarm/media state) — it gates the transcript sink below.
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
  // Bumped by every `join()` and by `leave()`; a join whose captured generation is stale was superseded
  // (the user left mid-connect) and must not finalize. See `join`/`leave`.
  #joinGeneration = 0;
  // Transcript sink (dissolved from the former TranscriptionManager): the feed this client's own native
  // segments are appended to, the ECHO service layer for that feed's space, and an optional enricher. Bound
  // by the meeting wiring via `setTranscriptFeed`/`setTranscriptEnricher`.
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

  /** Transcription on/off for the current call (drives the toolbar toggle; gates the transcript sink). */
  get transcriptionEnabledAtom(): Atom.Atom<boolean> {
    return this._transcriptionEnabledAtom;
  }

  /** Derived atom for self. */
  get selfAtom(): Atom.Atom<UserState> {
    return this._selfAtom;
  }

  /** Derived atom for tracks. */
  get tracksAtom(): Atom.Atom<Tracks> {
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
    private readonly _registry: Registry.Registry,
    options: CallManagerOptions = {},
  ) {
    super();
    this._client.config.getOrThrow('runtime.services.edge.url');
    const networkService = this._client.services.services.NetworkService;
    invariant(networkService, 'network service not found');
    this._swarmSynchronizer = new CallSwarmSynchronizer({ networkService });
    this._mediaManager = new MediaManager();
    this._roomJoiner = createEdgeRoomJoiner(this._client);
    this._createMeeting = options.createMeeting ?? createRealtimeKitMeetingFactory();
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

  // Not `@synchronized`: flip presence to "joined" immediately (optimistic) so the in-call UI shows without
  // waiting for a prior in-flight join or a queued teardown to release the lock. The real work runs in the
  // serialized `_runJoin`. `roomId` was set by the caller (`provider.join`) before this.
  async join(): Promise<void> {
    // Validate before the optimistic flip so a missing room id / device key can't leave us marked joined.
    const roomId = this._swarmSynchronizer._getState().roomId;
    const deviceKey = this._client.halo.device?.deviceKey.toHex();
    invariant(roomId && deviceKey, 'room id and device key are required to join a call');

    const generation = ++this.#joinGeneration;
    this._swarmSynchronizer.setJoined(true);
    try {
      await this._runJoin(generation, roomId, deviceKey);
    } catch (error) {
      // Roll back the optimistic flip and release any partially-acquired swarm/media state — otherwise the
      // UI is stuck showing "in call" with no working connection. Skip if a newer join/leave already
      // superseded this attempt: that call chain owns the state now and this one must not clobber it.
      if (generation === this.#joinGeneration) {
        this._swarmSynchronizer.setJoined(false);
        await this._teardown();
      }
      throw error;
    }
  }

  // TODO(mykola): Reconcile with _swarmSynchronizer.state.joined.
  @synchronized
  private async _runJoin(generation: number, roomId: string, deviceKey: string): Promise<void> {
    // Superseded by a leave (or newer join) while queued behind a prior in-flight join.
    if (generation !== this.#joinGeneration) {
      return;
    }

    await this._swarmSynchronizer.join();

    // A `leave()` raced in during the swarm join. Bail *before* opening a RealtimeKit meeting — this is the
    // main defence against rapid join/leave churning meetings (create+destroy back-to-back with the same
    // participant id leaves the SFU unable to push/pull). The pending `_teardown` undoes the swarm join.
    if (generation !== this.#joinGeneration) {
      return;
    }

    // Share one RealtimeKit meeting across participants: reuse the id a peer already advertised, else the
    // edge mints one below. Coordinated via the swarm (roomId maps 1:1 to a RealtimeKit meeting id).
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
      // Advertise as soon as the edge join returns (before the SFU connect) so a concurrently-joining peer
      // converges on this meeting rather than minting its own. Skip if superseded: this join's meeting will
      // never actually be attended, so advertising it would steer a real peer into a doomed meeting.
      onMeetingResolved: (id) => {
        if (generation === this.#joinGeneration) {
          this._swarmSynchronizer.advertiseMeetingId(id);
        }
      },
    });
    await this._mediaManager.join(transport);

    // A `leave()` during the (multi-second) SFU connect bumped the generation: abandon this join without
    // finalizing. The transport is already held by `MediaManager` and is torn down by the pending
    // `_teardown()` the leave scheduled; emitting `roomJoined` now would resurrect a call we've left.
    if (generation !== this.#joinGeneration) {
      return;
    }

    // Native transcription broadcasts every participant; persist only our own so each segment is written once.
    this.#transcriptUnsubscribe = transport.subscribeTranscripts?.((event) => {
      if (event.deviceKey === deviceKey) {
        void this.#writeTranscript(event).catch((error) => log.catch(error));
      }
    });

    this.roomJoined.emit({ roomId });
  }

  // Not `@synchronized`: the optimistic presence flip must run immediately (even while an in-flight `join`
  // holds the lock) so the UI returns to the lobby without waiting for the SFU connect. The actual teardown
  // is deferred to `_teardown` (which does take the lock).
  async leave(): Promise<void> {
    // Flip presence now (synchronous emit) so the lobby shows immediately, and bump the generation so an
    // in-flight join bails instead of finalizing after we've left.
    this._swarmSynchronizer.setJoined(false);
    this.#joinGeneration++;
    await this._teardown();
  }

  @synchronized
  private async _teardown(): Promise<void> {
    this.#transcriptUnsubscribe?.();
    this.#transcriptUnsubscribe = undefined;
    // Reset the transcript sink: we're leaving the call, so stop writing and clear the binding + toggle
    // (the meeting wiring re-primes them via `setTranscriptFeed`/`setTranscriptEnricher` on the next join).
    this.#transcriptFeed = undefined;
    this.#transcriptFeedServiceLayer = undefined;
    this.#transcriptEnricher = undefined;
    this._registry.set(this._transcriptionEnabledAtom, false);
    // Do NOT touch the `joined` presence flag here: it is owned by the optimistic `join()`/`leave()`
    // wrappers (last user intent). A queued teardown from a prior leave must not flip a *superseding*
    // optimistic `join()` back to the lobby — it only releases the old call's resources.
    await this._swarmSynchronizer.leave();
    await this._mediaManager.leave();
    const roomId = this._registry.get(this._roomIdAtom);
    roomId && this.left.emit(roomId);
  }

  //
  // Transcription sink (dissolved from the former TranscriptionManager). Native segments arrive via the
  // transport's `subscribeTranscripts` (this client's own speech only) and are written straight to the feed.
  //

  /** Bind the ECHO feed this call's own native transcript segments are appended to. */
  setTranscriptFeed(space: Space, feed: Feed.Feed): void {
    this.#transcriptFeed = feed;
    this.#transcriptFeedServiceLayer = Database.layer(space.db);
  }

  /** Toggle whether native transcript segments are persisted to the bound feed. */
  setTranscriptionEnabled(enabled: boolean): void {
    this._registry.set(this._transcriptionEnabledAtom, enabled);
  }

  /** Inject the message enricher (e.g. entity linking) applied to each segment before it is appended. */
  setTranscriptEnricher(enricher?: TranscriptMessageEnricher): void {
    this.#transcriptEnricher = enricher;
  }

  /**
   * Append one native transcript segment (this client's own speech) to the bound feed, enriching it first
   * when an enricher is set. No-op unless transcription is enabled and a feed is bound.
   */
  async #writeTranscript(event: TranscriptEvent): Promise<void> {
    if (
      !this._registry.get(this._transcriptionEnabledAtom) ||
      !this.#transcriptFeed ||
      !this.#transcriptFeedServiceLayer
    ) {
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
      sender: { identityDid: this._client.halo.identity.get()?.did },
    });
    if (this.#transcriptEnricher) {
      message = await this.#transcriptEnricher(message);
    }

    await Feed.append(this.#transcriptFeed, [message]).pipe(
      Effect.provide(this.#transcriptFeedServiceLayer),
      EffectEx.runAndForwardErrors,
    );
  }

  private _onCallStateUpdated(state: CallState): void {
    // Remote tracks are pulled event-driven by `MediaManager` (from transport roster changes), not from the
    // swarm. The swarm stays the source of truth for presence/metadata; the UI resolves cached streams by the
    // names advertised here.
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
    this._registry.set(this._stateAtom, {
      call: this._swarmSynchronizer._getState(),
      media: this._mediaManager._getState(),
    });
  }

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
