//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type JsonObject, type JsonValue } from '@bufbuild/protobuf';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';

import { unpackJson } from './buf/index.ts';
import { type Messenger } from './messenger.ts';

/**
 * Who a session belongs to. Every surface sends the same info, so a member keeps one name and colour across
 * text, drawings and grids.
 */
export type Info = {
  displayName: string;
  /** CSS colours for the two themes. */
  darkColor: string;
  lightColor: string;
  /** Member hue (a palette name such as `red`); absent from clients that predate it. */
  hue?: string;
};

export type Peer = {
  /** The identity: one identity on two devices is two sessions with one `peerId`. */
  peerId: string;
  info: Info;
};

/**
 * Another client's latest state.
 */
export type RemoteSession<T> = Peer & {
  sessionId: string;
  /** Absent while the session shares nothing (the pointer left the surface, the editor lost focus). */
  value?: T;
  /** When the sender's value last changed, by this client's clock; ranks one identity's sessions. */
  changedAt: number;
};

/**
 * Gossip channel id for one kind of awareness about one object, so two surfaces on one object never read each
 * other's values.
 */
export const channelId = (kind: string, objectId: string) => `awareness.${kind}.${objectId}`;

export type Timing = {
  /** Minimum time between two posts of a changing value. */
  throttle: number;
  /** Gossip reaches only the peers connected when a message is sent, so state is re-sent this often. */
  heartbeat: number;
  /** A local value left unchanged this long is withdrawn; `undefined` keeps it. */
  idle?: number;
};

/** The timing the editor's collaboration cursors have always used. */
export const DEFAULT_TIMING: Timing = { throttle: 100, heartbeat: 15_000 };

/** Long enough that one lost heartbeat never drops a session, whatever the observer's tick phase. */
export const expiry = ({ heartbeat }: Timing) => 3 * heartbeat;

export type ChannelProps<T, I extends JsonValue> = {
  messenger: Messenger;
  /** See {@link channelId}. */
  channel: string;
  peer: Peer;
  /**
   * The value's shape, owned by the surface: a caret, a point in the surface's own coordinates, a cell range.
   * Also validates remote values, which are JSON of unknown provenance.
   */
  schema: Schema.Codec<T, I>;
  timing?: Timing;
};

export type UpdateOptions = {
  /** False when the value changed without the user acting (a remote edit shifted the caret); defaults to true. */
  moved?: boolean;
};

/**
 * Shares a small, frequently changing value (a cursor, a pointer, a selection) with the other clients on a space
 * gossip channel. A session lives from `open` to `close`, and peers drop one that stops answering.
 *
 * The channel knows nothing about what the value means. Each surface defines its own value schema in its own
 * coordinates, such as an automerge cursor pair for text, a point in page space for a drawing, or a pair of
 * row and column ids for a grid. Give each its own {@link channelId} kind.
 *
 * On the wire: `{ kind: 'query' }`, `{ kind: 'leave', peerId, sessionId }`, and
 * `{ kind: 'post', state: { peerId, info, position? }, sessionId, age }`, where `position` carries the encoded
 * value (the name comes from the editor's cursors, which this format started as) and `age` is the milliseconds
 * since it changed, so recency never compares clocks across devices. A post without `sessionId` comes from a
 * client that predates sessions; it never expires, and gives way to a newer session of its identity.
 */
export class Channel<T, I extends JsonValue = JsonValue> {
  /** Fires when a remote session is added, removed or re-posted. */
  readonly changed = new Event<void>();

  readonly #messenger: Messenger;
  readonly #channel: string;
  readonly #peer: Peer;
  readonly #decodeValue: (value: unknown) => Option.Option<T>;
  readonly #encodeValue: (value: T) => I;
  readonly #timing: Timing;
  readonly #remote = new Map<string, RemoteSession<T> & { seenAt: number; expires: boolean }>();

  #ctx?: Context;
  #sessionId?: string;
  /** Whether there is local state to post at all: nothing is sent before the first update. */
  #active = false;
  #local?: T;
  #changedAt = 0;
  #lastPost = Number.NEGATIVE_INFINITY;
  #pending?: ReturnType<typeof setTimeout>;

  constructor({ messenger, channel, peer, schema, timing = DEFAULT_TIMING }: ChannelProps<T, I>) {
    this.#messenger = messenger;
    this.#channel = channel;
    this.#peer = peer;
    this.#decodeValue = Schema.decodeUnknownOption(schema);
    this.#encodeValue = Schema.encodeSync(schema);
    this.#timing = timing;
  }

  open(): void {
    if (this.#ctx) {
      return;
    }

    const ctx = new Context();
    this.#ctx = ctx;
    this.#sessionId = crypto.randomUUID();

    const listener = this.#messenger.listen(this.#channel, (message) => {
      if (!ctx.disposed) {
        this.#receive(unpackJson(message.payload));
      }
    });
    ctx.onDispose(listener);

    // Replies to a query sent before the listener is registered would be dropped.
    void listener.ready
      .then(async () => {
        if (!ctx.disposed) {
          await this.#messenger.postMessage(this.#channel, { kind: 'query' });
        }
      })
      .catch((err) => log.debug('failed to query awareness', { err }));

    const heartbeat = setInterval(() => this.#tick(), this.#timing.heartbeat);
    ctx.onDispose(() => {
      clearInterval(heartbeat);
      clearTimeout(this.#pending);
      this.#pending = undefined;
    });
  }

  close(): void {
    if (!this.#ctx || !this.#sessionId) {
      return;
    }

    if (this.#active) {
      this.#send({ kind: 'leave', peerId: this.#peer.peerId, sessionId: this.#sessionId });
    }
    void this.#ctx.dispose();
    this.#ctx = undefined;
    this.#sessionId = undefined;
    // A reopened channel is a new session and must not re-announce the old one's value.
    this.#active = false;
    this.#local = undefined;
    if (this.#remote.size > 0) {
      this.#remote.clear();
      this.changed.emit();
    }
  }

  /** Every open remote session, including those that share nothing right now; see {@link latestPerPeer}. */
  getSessions(): RemoteSession<T>[] {
    return Array.from(this.#remote.values(), ({ peerId, info, sessionId, value, changedAt }) => ({
      peerId,
      info,
      sessionId,
      value,
      changedAt,
    }));
  }

  /**
   * Sets the local value; `undefined` withdraws it while keeping the session.
   */
  update(value: T | undefined, { moved = true }: UpdateOptions = {}): void {
    // Nothing to draw or rank, so only the change to empty is posted.
    if (value === undefined && this.#active && this.#local === undefined) {
      return;
    }

    if (moved || !this.#active) {
      this.#changedAt = performance.now();
    }
    this.#active = true;
    this.#local = value;
    this.#schedule();
  }

  #receive(payload: JsonObject | undefined): void {
    switch (payload?.kind) {
      case 'query': {
        this.#schedule();
        break;
      }

      case 'leave': {
        if (typeof payload.sessionId === 'string' && this.#remote.delete(payload.sessionId)) {
          this.changed.emit();
        }
        break;
      }

      case 'post': {
        const post = this.#readPost(payload);
        if (!post) {
          log.debug('dropped malformed awareness message', { channel: this.#channel });
          return;
        }

        this.#receivePost(post);
        break;
      }
    }
  }

  #receivePost({ peer, sessionId, value, age }: Post<T>): void {
    const key = sessionId ?? peer.peerId;
    const previous = this.#remote.get(key);
    // A session seen for the first time may have opened after our last post.
    if (!previous) {
      this.#schedule();
    }

    const now = performance.now();
    // An older client's unchanged post says nothing about when it moved.
    const changedAt = age !== undefined ? now - age : (previous?.changedAt ?? now);
    if (sessionId !== undefined) {
      const legacy = this.#remote.get(peer.peerId);
      if (legacy && !legacy.expires && legacy.changedAt <= changedAt) {
        this.#remote.delete(peer.peerId);
      }
    }

    this.#remote.set(key, { ...peer, sessionId: key, value, changedAt, seenAt: now, expires: sessionId !== undefined });
    this.changed.emit();
  }

  #readPost(payload: JsonObject): Post<T> | undefined {
    const state = readObject(payload.state);
    const info = readObject(state?.info);
    if (typeof state?.peerId !== 'string' || !info) {
      return undefined;
    }

    let value: T | undefined;
    if (state.position !== undefined) {
      const decoded = this.#decodeValue(state.position);
      if (Option.isNone(decoded)) {
        return undefined;
      }
      value = decoded.value;
    }

    return {
      peer: {
        peerId: state.peerId,
        info: {
          displayName: String(info.displayName ?? ''),
          darkColor: String(info.darkColor ?? ''),
          lightColor: String(info.lightColor ?? ''),
          ...(typeof info.hue === 'string' ? { hue: info.hue } : {}),
        },
      },
      sessionId: typeof payload.sessionId === 'string' ? payload.sessionId : undefined,
      value,
      age: typeof payload.age === 'number' && payload.age >= 0 ? payload.age : undefined,
    };
  }

  #tick(): void {
    const now = performance.now();
    let expired = false;
    for (const [key, { seenAt, expires }] of this.#remote) {
      if (expires && now - seenAt > expiry(this.#timing)) {
        this.#remote.delete(key);
        expired = true;
      }
    }
    if (expired) {
      this.changed.emit();
    }

    const { idle } = this.#timing;
    if (idle !== undefined && this.#local !== undefined && now - this.#changedAt > idle) {
      this.update(undefined);
    } else {
      this.#schedule();
    }
  }

  /** Posts the local state now, or at the end of the current throttle window. */
  #schedule(): void {
    if (!this.#ctx || !this.#active || this.#pending) {
      return;
    }

    const wait = this.#lastPost + this.#timing.throttle - performance.now();
    if (wait <= 0) {
      this.#flush();
    } else {
      this.#pending = setTimeout(() => {
        this.#pending = undefined;
        this.#flush();
      }, wait);
    }
  }

  #flush(): void {
    if (!this.#ctx || !this.#sessionId || !this.#active) {
      return;
    }

    this.#lastPost = performance.now();
    const { peerId, info } = this.#peer;
    this.#send({
      kind: 'post',
      state: {
        peerId,
        info: {
          displayName: info.displayName,
          darkColor: info.darkColor,
          lightColor: info.lightColor,
          ...(info.hue !== undefined ? { hue: info.hue } : {}),
        },
        ...(this.#local !== undefined ? { position: this.#encodeValue(this.#local) } : {}),
      },
      sessionId: this.#sessionId,
      age: performance.now() - this.#changedAt,
    });
  }

  #send(message: JsonObject): void {
    void this.#messenger
      .postMessage(this.#channel, message)
      .catch((err) => log.debug('failed to post awareness', { err }));
  }
}

export type LatestPerPeerOptions<T> = {
  /** Sessions this returns true for outrank the rest, however recent; for example, those with a value. */
  prefer?: (session: RemoteSession<T>) => boolean;
};

/**
 * One session per identity, for surfaces that show a member once however many tabs or devices they have open:
 * the most recently changed of the preferred sessions, else the most recently changed.
 */
export const latestPerPeer = <T>(
  sessions: readonly RemoteSession<T>[],
  { prefer = () => true }: LatestPerPeerOptions<T> = {},
): RemoteSession<T>[] => {
  const outranks = (session: RemoteSession<T>, other: RemoteSession<T>) =>
    prefer(session) === prefer(other) ? session.changedAt > other.changedAt : prefer(session);

  const byPeer = new Map<string, RemoteSession<T>>();
  for (const session of sessions) {
    const current = byPeer.get(session.peerId);
    if (!current || outranks(session, current)) {
      byPeer.set(session.peerId, session);
    }
  }
  return [...byPeer.values()];
};

type Post<T> = { peer: Peer; sessionId?: string; value?: T; age?: number };

const readObject = (value: JsonValue | undefined): JsonObject | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? value : undefined;
