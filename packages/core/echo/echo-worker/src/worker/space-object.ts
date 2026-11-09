//
// Copyright 2026 DXOS.org
//

import { DurableObject } from 'cloudflare:workers';

import type { ClientMessage, ServerMessage, SyncRecord, SyncRequest, SyncResponse } from '../protocol.ts';

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

type Row = {
  key: string;
  version: number;
  typename: string;
  props: string;
  refs: string;
  deleted: number;
};

/**
 * The version authority for one graph.
 *
 * A Durable Object is single-threaded and there is exactly one per slug, so versions are assigned
 * in a total order with no coordination — which is what makes last-writer-wins well defined rather
 * than a race. This is the feed protocol's position authority applied to objects instead of blocks.
 *
 * Rows live in the object's own SQLite, created on demand by the first sync.
 *
 * A client connects a socket and is told about a write as it happens; the POST endpoint remains, so a peer that
 * cannot hold a socket open — or a script with `curl` — still syncs by asking. Sockets are accepted through the
 * hibernation API, so an idle graph holds no memory and costs no duration: the runtime wakes the object with the
 * message and `getWebSockets()` returns the connections it was holding.
 */
export class SpaceObject extends DurableObject<SpaceEnv> {
  #ready = false;

  #init(): void {
    if (this.#ready) {
      return;
    }
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS records (
        key      TEXT    PRIMARY KEY,
        version  INTEGER NOT NULL,
        typename TEXT    NOT NULL,
        props    TEXT    NOT NULL,
        refs     TEXT    NOT NULL,
        deleted  INTEGER NOT NULL DEFAULT 0
      )
    `);
    this.ctx.storage.sql.exec('CREATE INDEX IF NOT EXISTS records_version ON records (version)');
    this.#ready = true;
  }

  /**
   * Names this incarnation of the store, so a client can tell that the one it is talking to is not
   * the one its saved version came from.
   *
   * Expiry drops the storage and versions start again from 0, which the version alone cannot show:
   * another peer may already have pushed the new store past the version a returning client saved.
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

  override async alarm(): Promise<void> {
    // Everything this object holds is the graph, so dropping its storage is the deletion.
    await this.ctx.storage.deleteAll();
    this.#ready = false;
  }

  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get('upgrade')?.toLowerCase() === 'websocket') {
      this.#init();
      const pair = new WebSocketPair();
      // Hibernation: the runtime holds the socket, not this instance, so an idle object can be evicted.
      this.ctx.acceptWebSocket(pair[1]);
      return new Response(null, { status: 101, webSocket: pair[0] });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: { allow: 'POST' } });
    }

    this.#init();

    let body: SyncRequest;
    try {
      body = (await request.json()) as SyncRequest;
    } catch {
      return new Response('Expected a JSON body', { status: 400 });
    }

    const since = Number.isSafeInteger(body?.since) && body.since >= 0 ? body.since : 0;
    const incoming = Array.isArray(body?.records) ? body.records : [];

    const refused = this.#refuse(incoming);
    if (refused) {
      return refused;
    }

    const applied = this.#apply(incoming);
    if (applied.length > 0) {
      // A socket client hears about this write without asking, which is the point of holding one.
      this.#broadcast(applied);
    }

    return Response.json(this.#since(since));
  }

  /** The hibernation API's callback: a client's `hello` or `push`, as JSON. */
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
      case 'hello': {
        const since = Number.isSafeInteger(parsed.since) && parsed.since >= 0 ? parsed.since : 0;
        ws.send(JSON.stringify(this.#message(this.#since(since))));
        break;
      }

      case 'push': {
        const incoming = Array.isArray(parsed.records) ? parsed.records : [];
        if (this.#refuse(incoming)) {
          ws.send(JSON.stringify({ type: 'error', message: 'Too many records' }));
          return;
        }
        const applied = this.#apply(incoming);
        if (applied.length > 0) {
          // The sender included: the broadcast carries the versions this object assigned.
          this.#broadcast(applied);
        }
        break;
      }
    }
  }

  /**
   * Over the limit, in the one place both transports ask.
   *
   * The cap is on the graph, which is the LIVE objects: a tombstone is how an object leaves it, and
   * an edit upserts, so neither may be refused — refusing them would strand a full graph with no way
   * back under the cap. What matters is therefore the size the graph reaches, not how many keys the
   * batch mentions: a batch that deletes one object and creates another leaves it the same size, and
   * one that deletes a key and writes it again leaves that key live. Replaying the batch over the
   * live key set is what counts both correctly, and it is replayed in order for the same reason
   * `#apply` writes in order. A malformed entry is skipped here exactly as `#apply` skips it, rather
   * than throwing and answering 500.
   */
  #refuse(incoming: readonly SyncRecord[]): Response | undefined {
    const live = this.#liveKeys();
    for (const record of incoming) {
      if (typeof record?.key !== 'string' || typeof record?.typename !== 'string') {
        continue;
      }
      if (record.deleted) {
        live.delete(record.key);
      } else {
        live.add(record.key);
      }
    }
    if (live.size > MAX_RECORDS) {
      return new Response(`Too many records: ${live.size} > ${MAX_RECORDS}`, { status: 413 });
    }
  }

  /** The keys the store holds as live objects; a tombstone's key is not one of them. */
  #liveKeys(): Set<string> {
    const rows = this.ctx.storage.sql.exec<{ key: string }>('SELECT key FROM records WHERE deleted = 0').toArray();
    return new Set(rows.map((row) => row.key));
  }

  /**
   * Writes the records in one transaction, so a client never observes half a batch, and returns them with the
   * versions this object assigned — the total order that makes last-writer-wins well defined rather than a race.
   */
  #apply(incoming: readonly SyncRecord[]): SyncRecord[] {
    if (incoming.length === 0) {
      return [];
    }
    this.#expiresAt();
    const applied: SyncRecord[] = [];
    this.ctx.storage.transactionSync(() => {
      let version = this.ctx.storage.kv.get<number>('version') ?? 0;
      for (const record of incoming) {
        if (typeof record?.key !== 'string' || typeof record?.typename !== 'string') {
          continue;
        }
        version++;
        // What the store holds, which is what the broadcast must carry: a record from a script may
        // omit either, or send something that is not an object at all.
        const props = isPlainObject(record.props) ? record.props : {};
        const refs = isPlainObject(record.refs) ? record.refs : {};
        this.ctx.storage.sql.exec(
          `INSERT INTO records (key, version, typename, props, refs, deleted) VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(key) DO UPDATE SET
               version = excluded.version,
               typename = excluded.typename,
               props = excluded.props,
               refs = excluded.refs,
               deleted = excluded.deleted`,
          record.key,
          version,
          record.typename,
          JSON.stringify(props),
          JSON.stringify(refs),
          record.deleted ? 1 : 0,
        );
        applied.push({
          key: record.key,
          typename: record.typename,
          props: props,
          refs: refs,
          ...(record.deleted ? { deleted: true } : {}),
          version,
        });
      }
      this.ctx.storage.kv.put('version', version);
    });
    return applied;
  }

  /** Everything above a version, which is both a first sync (`0`) and a catch-up after a reconnect. */
  #since(since: number): SyncResponse {
    const rows = this.ctx.storage.sql
      .exec<Row>(
        'SELECT key, version, typename, props, refs, deleted FROM records WHERE version > ? ORDER BY version',
        since,
      )
      .toArray();

    return {
      version: this.ctx.storage.kv.get<number>('version') ?? 0,
      incarnation: this.#incarnation(),
      expiresAt: this.#expiresAt(),
      records: rows.map((row): SyncRecord => ({
        key: row.key,
        version: row.version,
        typename: row.typename,
        props: JSON.parse(row.props),
        refs: JSON.parse(row.refs),
        ...(row.deleted ? { deleted: true } : {}),
      })),
    };
  }

  #message(response: SyncResponse): ServerMessage {
    return { type: 'records', ...response };
  }

  /** To every socket this object holds, the sender included: the records as the store now has them. */
  #broadcast(records: readonly SyncRecord[]): void {
    const message = JSON.stringify(
      this.#message({
        version: this.ctx.storage.kv.get<number>('version') ?? 0,
        incarnation: this.#incarnation(),
        records,
        expiresAt: this.#expiresAt(),
      }),
    );
    for (const socket of this.ctx.getWebSockets()) {
      try {
        socket.send(message);
      } catch {
        // A socket closing mid-broadcast is ordinary; the client re-reads from its version on reconnect.
      }
    }
  }
}
