//
// Copyright 2026 DXOS.org
//

import { DurableObject } from 'cloudflare:workers';

import type {
  ClientMessage,
  PushRecord,
  PushRequest,
  PushResult,
  RecordsMessage,
  StoreInfo,
  SyncRecord,
} from './protocol.ts';

export type SpaceEnv = {
  /** One object per slug. */
  readonly SPACE: DurableObjectNamespace<SpaceObject>;
};

/** Graphs are demo scratch space, not storage. */
const TTL_MS = 24 * 60 * 60 * 1000;

/** A demo bound; a graph this size is past what the demo is showing. */
export const MAX_RECORDS = 1_000;

/** A record's `props` and `refs` are objects; a client that sends anything else gets an empty one. */
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isRecord = (record: PushRecord | undefined): record is PushRecord =>
  typeof record?.key === 'string' && typeof record?.typename === 'string';

const nonNegative = (value: unknown): number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;

type Row = {
  key: string;
  seq: number;
  typename: string;
  props: string;
  refs: string;
  deleted: number;
};

/** The push was over the record cap; nothing was applied. */
export class TooManyRecordsError extends Error {
  constructor(size: number) {
    super(`Too many records: ${size} > ${MAX_RECORDS}`);
    this.name = 'TooManyRecordsError';
  }
}

/**
 * The sequence authority for one graph.
 *
 * A Durable Object is single-threaded and there is exactly one per slug, so it hands out seqs in a total
 * order with no coordination and no clock. A push is applied only when every record's `base` is still
 * its current seq — compare-and-set per record, all or nothing — so a client never overwrites a version
 * it did not see; when one is stale the client is sent what it missed, merges, and pushes again.
 *
 * Rows live in the object's own SQLite, created on demand by the first request.
 *
 * A client connects a socket and is told about a write as it happens; the POST endpoint remains for a
 * peer that cannot hold a socket open, and for a script with `curl`. Sockets are accepted through the
 * hibernation API, so an idle graph holds no memory and costs no duration.
 */
export class SpaceObject extends DurableObject<SpaceEnv> {
  #ready = false;

  #init(): void {
    if (this.#ready) {
      return;
    }
    // `records` was the wall-order table of the first protocol; graphs are scratch, so it is dropped.
    this.ctx.storage.sql.exec('DROP TABLE IF EXISTS records');
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS entries (
        key      TEXT    PRIMARY KEY,
        seq      INTEGER NOT NULL,
        typename TEXT    NOT NULL,
        props    TEXT    NOT NULL,
        refs     TEXT    NOT NULL,
        deleted  INTEGER NOT NULL DEFAULT 0
      )
    `);
    this.ctx.storage.sql.exec('CREATE INDEX IF NOT EXISTS entries_seq ON entries (seq)');
    this.#ready = true;
  }

  #seq(): number {
    return this.ctx.storage.kv.get<number>('seq') ?? 0;
  }

  /**
   * Names this incarnation of the store, so a client can tell that the one it is talking to is not
   * the one its saved seq came from.
   */
  #incarnation(): string {
    let incarnation = this.ctx.storage.kv.get<string>('incarnation');
    if (incarnation === undefined) {
      incarnation = crypto.randomUUID();
      this.ctx.storage.kv.put('incarnation', incarnation);
    }
    return incarnation;
  }

  /** Set once, on the first write, so a graph expires 24h after it was created. */
  #expiresAt(): number {
    let createdAt = this.ctx.storage.kv.get<number>('createdAt');
    if (createdAt === undefined) {
      createdAt = Date.now();
      this.ctx.storage.kv.put('createdAt', createdAt);
      void this.ctx.storage.setAlarm(createdAt + TTL_MS);
    }
    return createdAt + TTL_MS;
  }

  #info(): StoreInfo {
    return { seq: this.#seq(), incarnation: this.#incarnation(), expiresAt: this.#expiresAt() };
  }

  override async alarm(): Promise<void> {
    // Everything this object holds is the graph, so dropping its storage is the deletion.
    await this.ctx.storage.deleteAll();
    this.#ready = false;
  }

  override async fetch(request: Request): Promise<Response> {
    this.#init();

    if (request.headers.get('upgrade')?.toLowerCase() === 'websocket') {
      const pair = new WebSocketPair();
      // Hibernation: the runtime holds the socket, not this instance, so an idle object can be evicted.
      this.ctx.acceptWebSocket(pair[1]);
      return new Response(null, { status: 101, webSocket: pair[0] });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: { allow: 'POST' } });
    }

    let body: PushRequest;
    try {
      body = (await request.json()) as PushRequest;
    } catch {
      return new Response('Expected a JSON body', { status: 400 });
    }

    try {
      return Response.json(this.#push(body));
    } catch (error) {
      if (error instanceof TooManyRecordsError) {
        return new Response(error.message, { status: 413 });
      }
      throw error;
    }
  }

  /** The hibernation API's callback: a client's `pull` or `push`, as JSON. */
  override async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    this.#init();

    let parsed: ClientMessage;
    try {
      parsed = JSON.parse(typeof message === 'string' ? message : new TextDecoder().decode(message)) as ClientMessage;
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Expected JSON' }));
      return;
    }

    switch (parsed?.type) {
      case 'pull': {
        const since = nonNegative(parsed.since);
        ws.send(JSON.stringify({ type: 'records', ...this.#info(), from: since, records: this.#since(since) }));
        break;
      }

      case 'push': {
        try {
          ws.send(JSON.stringify(this.#push(parsed, ws)));
        } catch (error) {
          if (error instanceof TooManyRecordsError) {
            ws.send(JSON.stringify({ type: 'error', message: error.message }));
            return;
          }
          throw error;
        }
        break;
      }
    }
  }

  /**
   * Applies a push if nothing it was based on has moved, and answers with everything above its `since`.
   *
   * On success every other socket is sent the applied records; the pusher learns their seqs from the
   * answer instead, which also carries anything it had not pulled yet.
   */
  #push(request: PushRequest, sender?: WebSocket): PushResult {
    const since = nonNegative(request.since);
    const incoming = (Array.isArray(request.records) ? request.records : []).filter(isRecord);
    const client = typeof request.client === 'string' ? request.client : undefined;
    const clientSeq = typeof request.clientSeq === 'number' ? request.clientSeq : undefined;
    const answer = (accepted: boolean, conflicts: string[]): PushResult => ({
      type: 'ack',
      ...this.#info(),
      ...(clientSeq !== undefined && { clientSeq }),
      accepted,
      conflicts,
      from: since,
      records: this.#since(since),
    });

    // A retry of a push already applied: the answer is the same, and applying it again would conflict.
    if (client !== undefined && clientSeq !== undefined) {
      const last = this.ctx.storage.kv.get<number>(`client:${client}`);
      if (last !== undefined && clientSeq <= last) {
        return answer(true, []);
      }
    }

    this.#refuse(incoming);

    const conflicts = incoming
      .filter((record) => record.base !== undefined && nonNegative(record.base) !== this.#seqOf(record.key))
      .map((record) => record.key);
    if (conflicts.length > 0) {
      return answer(false, conflicts);
    }

    const from = this.#seq();
    const applied = this.#apply(incoming);
    if (client !== undefined && clientSeq !== undefined) {
      this.ctx.storage.kv.put(`client:${client}`, clientSeq);
    }
    if (applied.length > 0) {
      this.#broadcast({ type: 'records', ...this.#info(), from, records: applied }, sender);
    }
    return answer(true, []);
  }

  /** The current seq of one key, or 0 for a key the store has never held. */
  #seqOf(key: string): number {
    const [row] = this.ctx.storage.sql.exec<{ seq: number }>('SELECT seq FROM entries WHERE key = ?', key).toArray();
    return row?.seq ?? 0;
  }

  /**
   * Over the limit, for both transports.
   *
   * The cap is on the LIVE objects: a tombstone is how an object leaves the graph and an edit upserts,
   * so neither may be refused — refusing them would strand a full graph. Replaying the batch over the
   * live key set, in order, counts a delete-then-create and a create-then-delete correctly.
   */
  #refuse(incoming: readonly PushRecord[]): void {
    const rows = this.ctx.storage.sql.exec<{ key: string }>('SELECT key FROM entries WHERE deleted = 0').toArray();
    const live = new Set(rows.map((row) => row.key));
    for (const record of incoming) {
      if (record.deleted) {
        live.delete(record.key);
      } else {
        live.add(record.key);
      }
    }
    if (live.size > MAX_RECORDS) {
      throw new TooManyRecordsError(live.size);
    }
  }

  /** Writes the records in one transaction, each stamped with the next seq, and returns them as stored. */
  #apply(incoming: readonly PushRecord[]): SyncRecord[] {
    if (incoming.length === 0) {
      return [];
    }
    this.#expiresAt();
    const applied: SyncRecord[] = [];
    this.ctx.storage.transactionSync(() => {
      let seq = this.#seq();
      for (const record of incoming) {
        seq++;
        // What the store holds is what the broadcast must carry: a script may send anything here.
        const props = isPlainObject(record.props) ? record.props : {};
        const refs: SyncRecord['refs'] = isPlainObject(record.refs) ? record.refs : {};
        this.ctx.storage.sql.exec(
          `INSERT INTO entries (key, seq, typename, props, refs, deleted) VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(key) DO UPDATE SET
               seq = excluded.seq,
               typename = excluded.typename,
               props = excluded.props,
               refs = excluded.refs,
               deleted = excluded.deleted`,
          record.key,
          seq,
          record.typename,
          JSON.stringify(props),
          JSON.stringify(refs),
          record.deleted ? 1 : 0,
        );
        applied.push({
          key: record.key,
          typename: record.typename,
          props,
          refs,
          ...(record.deleted ? { deleted: true } : {}),
          seq,
        });
      }
      this.ctx.storage.kv.put('seq', seq);
    });
    return applied;
  }

  /** Everything above a seq, which is both a first sync (`0`) and a catch-up after a reconnect. */
  #since(since: number): SyncRecord[] {
    return this.ctx.storage.sql
      .exec<Row>('SELECT key, seq, typename, props, refs, deleted FROM entries WHERE seq > ? ORDER BY seq', since)
      .toArray()
      .map((row): SyncRecord => ({
        key: row.key,
        seq: row.seq,
        typename: row.typename,
        props: JSON.parse(row.props),
        refs: JSON.parse(row.refs),
        ...(row.deleted ? { deleted: true } : {}),
      }));
  }

  /** To every socket this object holds except the one that pushed, which gets its own answer. */
  #broadcast(message: RecordsMessage, except?: WebSocket): void {
    const data = JSON.stringify(message);
    for (const socket of this.ctx.getWebSockets()) {
      if (socket === except) {
        continue;
      }
      try {
        socket.send(data);
      } catch {
        // A socket closing mid-broadcast is ordinary; the client pulls from its seq on reconnect.
      }
    }
  }
}
