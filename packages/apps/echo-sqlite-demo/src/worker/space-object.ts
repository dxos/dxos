//
// Copyright 2026 DXOS.org
//

import { DurableObject } from 'cloudflare:workers';

import type { SyncRecord, SyncRequest, SyncResponse } from '../core/protocol.ts';

export type SpaceEnv = {
  /** One object per slug. */
  readonly SPACE: DurableObjectNamespace<SpaceObject>;
};

/** Graphs are demo scratch space, not storage. */
const TTL_MS = 24 * 60 * 60 * 1000;

/** A demo bound; a graph this size is past what the demo is showing. */
const MAX_RECORDS = 10_000;

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

    const count = this.#count();
    if (count + incoming.length > MAX_RECORDS) {
      return new Response(`Too many records: ${count} + ${incoming.length} > ${MAX_RECORDS}`, { status: 413 });
    }

    const expiresAt = this.#expiresAt();

    // One transaction, so a client never observes half a batch.
    if (incoming.length > 0) {
      this.ctx.storage.transactionSync(() => {
        let version = this.ctx.storage.kv.get<number>('version') ?? 0;
        for (const record of incoming) {
          if (typeof record?.key !== 'string' || typeof record?.typename !== 'string') {
            continue;
          }
          version++;
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
            JSON.stringify(record.props ?? {}),
            JSON.stringify(record.refs ?? {}),
            record.deleted ? 1 : 0,
          );
        }
        this.ctx.storage.kv.put('version', version);
      });
    }

    const version = this.ctx.storage.kv.get<number>('version') ?? 0;
    const rows = this.ctx.storage.sql
      .exec<Row>(
        'SELECT key, version, typename, props, refs, deleted FROM records WHERE version > ? ORDER BY version',
        since,
      )
      .toArray();

    const response: SyncResponse = {
      version,
      expiresAt,
      records: rows.map((row): SyncRecord => ({
        key: row.key,
        version: row.version,
        typename: row.typename,
        props: JSON.parse(row.props),
        refs: JSON.parse(row.refs),
        ...(row.deleted ? { deleted: true } : {}),
      })),
    };

    return Response.json(response);
  }

  #count(): number {
    const [row] = this.ctx.storage.sql.exec<{ n: number }>('SELECT COUNT(*) AS n FROM records').toArray();
    return Number(row?.n ?? 0);
  }
}
