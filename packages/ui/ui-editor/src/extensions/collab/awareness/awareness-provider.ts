//
// Copyright 2024 DXOS.org
//

import { type JsonObject, type JsonValue } from '@bufbuild/protobuf';

import { DeferredTask, Event, scheduleTaskInterval, sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Messenger } from '@dxos/protocols';
import { unpackJson } from '@dxos/protocols/buf';
import { type GossipMessage } from '@dxos/protocols/buf/dxos/mesh/teleport/gossip_pb';

import {
  type AwarenessInfo,
  type AwarenessPosition,
  type AwarenessProvider,
  type AwarenessState,
  type AwarenessUpdateOptions,
} from './awareness.ts';

type ProtocolMessage =
  | {
      kind: 'query';
    }
  | {
      kind: 'post';
      state: AwarenessState;
      /** One per open provider; absent from peers that predate it. */
      sessionId?: string;
      /** Milliseconds since the sender's state changed, so recency never compares clocks across devices. */
      age?: number;
    }
  | {
      kind: 'leave';
      peerId: string;
      sessionId: string;
    };

/**
 * The channel's protocol on the wire, where the envelope carries an opaque `Struct`.
 *
 * Written and read field by field: the payload is JSON of unknown provenance, so its shape is
 * established here rather than assumed of it.
 */
const toJson = (message: ProtocolMessage): JsonObject => {
  switch (message.kind) {
    case 'query':
      return { kind: 'query' };
    case 'leave':
      return { kind: 'leave', peerId: message.peerId, sessionId: message.sessionId };
    case 'post':
      return {
        kind: 'post',
        state: {
          peerId: message.state.peerId,
          info: { ...message.state.info },
          ...(message.state.position ? { position: { ...message.state.position } } : {}),
        },
        ...(message.sessionId !== undefined ? { sessionId: message.sessionId } : {}),
        ...(message.age !== undefined ? { age: message.age } : {}),
      };
  }
};

const fromJson = (payload: JsonObject | undefined): ProtocolMessage | undefined => {
  if (payload?.kind === 'query') {
    return { kind: 'query' };
  }
  if (payload?.kind === 'leave') {
    return typeof payload.peerId === 'string' && typeof payload.sessionId === 'string'
      ? { kind: 'leave', peerId: payload.peerId, sessionId: payload.sessionId }
      : undefined;
  }
  if (payload?.kind !== 'post') {
    return undefined;
  }

  const state = readObject(payload.state);
  const info = readObject(state?.info);
  const position = readObject(state?.position);
  if (typeof state?.peerId !== 'string' || !info) {
    return undefined;
  }

  return {
    kind: 'post',
    state: {
      peerId: state.peerId,
      info: {
        displayName: String(info.displayName ?? ''),
        darkColor: String(info.darkColor ?? ''),
        lightColor: String(info.lightColor ?? ''),
      },
      position: position && {
        anchor: typeof position.anchor === 'string' ? position.anchor : undefined,
        head: typeof position.head === 'string' ? position.head : undefined,
      },
    },
    sessionId: typeof payload.sessionId === 'string' ? payload.sessionId : undefined,
    age: typeof payload.age === 'number' && payload.age >= 0 ? payload.age : undefined,
  };
};

const readObject = (value: JsonValue | undefined): JsonObject | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? value : undefined;

const DEBOUNCE_INTERVAL = 100; // ms

/**
 * Gossip reaches only the peers connected when a message is sent, so state is re-sent for peers whose
 * connection came up after the last change.
 */
const ANNOUNCE_INTERVAL = 15_000; // ms

/** Long enough that one lost re-announcement never drops a session, whatever the observer's tick phase. */
const EXPIRY_INTERVAL = 3 * ANNOUNCE_INTERVAL; // ms

type RemoteSession = {
  state: AwarenessState;
  /** When the sender's state changed, by this observer's clock; picks the session shown for its identity. */
  changedAt: number;
  /** Local time of the last post, unchanged or not. */
  seenAt: number;
  /** Peers that predate sessions never re-announce, so their state is kept. */
  expires: boolean;
};

/** An empty cursor stands for a document the sender could not resolve, so it draws nothing. */
const hasCaret = ({ position }: AwarenessState): boolean => !!position?.anchor && !!position?.head;

/** The session shown for an identity: the most recently changed one with a caret, else the most recent. */
const latestSession = (sessions: Map<string, RemoteSession>): RemoteSession => {
  const [latest] = [...sessions.values()].sort(
    (a, b) => Number(hasCaret(b.state)) - Number(hasCaret(a.state)) || b.changedAt - a.changedAt,
  );
  return latest;
};

export type AwarenessProviderProps = {
  messenger: Messenger;
  channel: string;
  peerId: string;
  info: AwarenessInfo;
};

/**
 * Receives and broadcasts profile and cursor position.
 */
export class SpaceAwarenessProvider implements AwarenessProvider {
  /** Sessions by identity: each open provider (tab, device) posts its own state. */
  private readonly _remoteSessions = new Map<string, Map<string, RemoteSession>>();

  private readonly _messenger: Messenger;
  private readonly _channel: string;
  private readonly _peerId: string;
  private readonly _info: AwarenessInfo;

  private _ctx?: Context;
  private _postTask?: DeferredTask;
  private _sessionId?: string;
  private _localState?: AwarenessState;
  private _localChangedAt = 0;

  public readonly remoteStateChange = new Event<void>();

  constructor({ messenger, channel, peerId, info }: AwarenessProviderProps) {
    this._messenger = messenger;
    this._channel = channel;
    this._peerId = peerId;
    this._info = info;
  }

  open(): void {
    const ctx = new Context();
    this._ctx = ctx;
    const sessionId = PublicKey.random().toHex();
    this._sessionId = sessionId;
    this._postTask = new DeferredTask(ctx, async () => {
      // A callback already scheduled runs even after close(); after a reopen it would post under this session.
      if (!ctx.disposed && this._localState) {
        // A rejection would dispose the provider's context, and with it the listener and the re-announce.
        await this._messenger
          .postMessage(
            this._channel,
            toJson({ kind: 'post', state: this._localState, sessionId, age: performance.now() - this._localChangedAt }),
          )
          .catch((err) => log.debug('failed to post awareness', { err }));

        // TODO(burdon): Replace with throttle.
        // TODO(burdon): Send heads?
        await sleep(DEBOUNCE_INTERVAL);
      }
    });

    const listener = this._messenger.listen(this._channel, (message: GossipMessage) => {
      const payload = fromJson(unpackJson(message.payload));
      switch (payload?.kind) {
        case 'query': {
          this._handleQueryMessage();
          break;
        }
        case 'post': {
          this._handlePostMessage(payload);
          break;
        }
        case 'leave': {
          this._handleLeaveMessage(payload);
          break;
        }
      }
    });
    ctx.onDispose(listener);

    // Replies to a query sent before the listener is registered would be dropped.
    void listener.ready
      .then(async () => {
        if (!ctx.disposed) {
          await this._messenger.postMessage(this._channel, toJson({ kind: 'query' }));
        }
      })
      .catch((err) => {
        log.debug('failed to query awareness', { err });
      });

    scheduleTaskInterval(
      ctx,
      async () => {
        this._postTask?.schedule();
        this._expireSessions();
      },
      ANNOUNCE_INTERVAL,
    );
  }

  close(): void {
    if (this._ctx && this._sessionId && this._localState) {
      void this._messenger
        .postMessage(this._channel, toJson({ kind: 'leave', peerId: this._peerId, sessionId: this._sessionId }))
        .catch((err) => log.debug('failed to leave awareness', { err }));
    }
    void this._ctx?.dispose();
    this._ctx = undefined;
    this._postTask = undefined;
    // A post already under way still runs after the dispose; without state it sends nothing.
    this._sessionId = undefined;
    this._localState = undefined;
    this._remoteSessions.clear();
  }

  /** One state per identity, from the session `latestSession` picks. */
  getRemoteStates(): AwarenessState[] {
    return Array.from(this._remoteSessions.values(), (sessions) => latestSession(sessions).state);
  }

  update(position: AwarenessPosition | undefined, { moved = true }: AwarenessUpdateOptions = {}): void {
    // Without a caret there is nothing to draw or rank, so only the change to caret-less is posted.
    if (!position && this._localState && !this._localState.position) {
      return;
    }

    // A cursor can stay put while the user types (it names the character after the caret), so recency
    // follows what the user did, not whether the cursor changed.
    if (moved || !this._localState) {
      this._localChangedAt = performance.now();
    }
    this._localState = {
      peerId: this._peerId,
      position,
      info: this._info,
    };

    // Safe no-op if called before open() or during async teardown after close().
    this._postTask?.schedule();
  }

  private _handleQueryMessage(): void {
    this._postTask?.schedule();
  }

  private _handlePostMessage(message: ProtocolMessage): void {
    invariant(message.kind === 'post');
    const { state } = message;
    const sessionId = message.sessionId ?? state.peerId;
    let sessions = this._remoteSessions.get(state.peerId);
    if (!sessions) {
      sessions = new Map();
      this._remoteSessions.set(state.peerId, sessions);
    }

    const previous = sessions.get(sessionId);
    // A session seen for the first time may have opened after our last post.
    if (!previous) {
      this._postTask?.schedule();
    }

    const now = performance.now();
    const changedAt = now - (message.age ?? 0);
    // An older client's state gives way to a session of its identity that changed after it.
    const legacy = message.sessionId !== undefined ? sessions.get(state.peerId) : undefined;
    const replacedLegacy = legacy !== undefined && legacy.changedAt <= changedAt && sessions.delete(state.peerId);

    // Re-announcements repeat unchanged state; only a change needs the editors to redraw.
    if (previous && !replacedLegacy && JSON.stringify(previous.state) === JSON.stringify(state)) {
      // The sender's age is authoritative; an older client's unchanged post says nothing about when it moved.
      previous.seenAt = now;
      if (message.age !== undefined) {
        // Typing can leave the cursor unchanged and still make this the session to show.
        const shown = latestSession(sessions);
        previous.changedAt = changedAt;
        if (latestSession(sessions) !== shown) {
          this.remoteStateChange.emit();
        }
      }
      return;
    }

    // TODO(wittjosiah): Is it helpful or confusing to show cursors for self on other devices?
    sessions.set(sessionId, { state, changedAt, seenAt: now, expires: message.sessionId !== undefined });
    this.remoteStateChange.emit();
  }

  private _handleLeaveMessage(message: ProtocolMessage): void {
    invariant(message.kind === 'leave');
    if (this._removeSession(message.peerId, message.sessionId)) {
      this.remoteStateChange.emit();
    }
  }

  private _expireSessions(): void {
    const now = performance.now();
    let removed = false;
    for (const [peerId, sessions] of this._remoteSessions) {
      for (const [sessionId, session] of sessions) {
        if (session.expires && now - session.seenAt > EXPIRY_INTERVAL) {
          removed = this._removeSession(peerId, sessionId) || removed;
        }
      }
    }
    if (removed) {
      this.remoteStateChange.emit();
    }
  }

  private _removeSession(peerId: string, sessionId: string): boolean {
    const sessions = this._remoteSessions.get(peerId);
    const removed = sessions?.delete(sessionId) ?? false;
    if (sessions?.size === 0) {
      this._remoteSessions.delete(peerId);
    }
    return removed;
  }
}
