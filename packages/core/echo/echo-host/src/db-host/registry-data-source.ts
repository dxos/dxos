//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';

import { type Context } from '@dxos/context';
import { type ObjectJSON } from '@dxos/echo/internal';
import { RuntimeProvider } from '@dxos/effect';
import {
  type DataSourceCursor,
  type IndexDataSource,
  type IndexerObject,
  REGISTRY_SPACE_ID,
  contentHash,
} from '@dxos/index-core';
import { log } from '@dxos/log';

/**
 * One entity as the client registered it.
 */
export type RegistryEntry = {
  /** Canonical entry key — a versioned DXN where the entity carries a version. */
  key: string;
  /** ECHO JSON of the entity. */
  objectJson: string;
};

export type RegistryDataSourceOptions = {
  runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient>;
  /** Digest probe against the persisted rows; supplied by the index engine. */
  lookupHashes: (
    keys: readonly string[],
  ) => Effect.Effect<Map<string, string | null>, SqlError.SqlError, SqlClient.SqlClient>;
};

type BufferedEntry = {
  key: string;
  json: string;
  hash: string;
  data: ObjectJSON;
  /** Registration order within this session; the cursor names a value of this sequence. */
  seq: number;
  updatedAt: number;
  /** Clients whose latest snapshot carries this key; the entry lives while any of them does. */
  owners: Set<string>;
};

/**
 * Indexable view of the entities the client has registered in its in-process registry.
 *
 * Unlike the automerge and feed sources this one is *pushed*: the registry lives in the client, so
 * there is nothing on the host to poll. {@link submit} takes a full snapshot of the client's
 * registry and this source turns it into the same `IndexerObject` stream the pull sources produce,
 * so registry entities land in `objectMeta` and the FTS snapshot table alongside everything else —
 * marked by a non-empty `registryKey`, which is what keeps them out of every space-scoped read.
 *
 * Three things decide what an update pass sees:
 *
 * - **Identity is the entry key, not the object id.** A key carries the version, so `…:0.1.0` and
 *   `…:0.2.0` are separate rows while a re-registration of one version replaces that row: last
 *   registered wins, even when the new entity is a different object.
 * - **Deduplication is by digest, twice.** A re-push of an unchanged entity does not advance its
 *   sequence, so it never enters the pipeline at all; and the first time a key is emitted in a
 *   session its digest is checked against the persisted row, which is what makes a restart — where
 *   the whole registry is pushed afresh — cost one query rather than a full re-index.
 * - **The buffer is the union across clients.** Several clients share one host and each pushes its
 *   whole registry, so an entry is dropped only once no client still carries it; taking one
 *   client's snapshot as the truth would have each push delete the others' entries.
 * - **Cursors are session-scoped.** The sequence restarts at zero with the process while the
 *   tracker's cursor is durable, so a bare number would read as "already indexed" against a fresh
 *   sequence and strand the whole registry. The cursor therefore carries the session id it was
 *   issued under (`<sessionId>:<seq>`) and a cursor from another session reads as the beginning.
 */
export class RegistryDataSource implements IndexDataSource {
  readonly sourceName = 'registry';

  readonly #runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient>;
  readonly #lookupHashes: RegistryDataSourceOptions['lookupHashes'];
  readonly #sessionId = crypto.randomUUID();

  /** Union of every connected client's registry, keyed by entry key. */
  readonly #entries = new Map<string, BufferedEntry>();

  /**
   * Persisted digest per entry key, as last read from the index; null where the key has no row.
   *
   * Cached rather than re-read because one update pass calls {@link getChangedObjects} once per
   * dependent index (each keeps its own cursor), and a probe whose result was discarded would
   * report "no row" on the second call and re-index an entry the first call had just skipped.
   * Only ever written from a read, never from an emit: a write that rolls back leaves its cursor
   * behind too, and the entry must still look un-indexed when the next pass re-offers it.
   */
  readonly #persistedHashes = new Map<string, string | null>();

  #seq = 0;

  constructor(options: RegistryDataSourceOptions) {
    this.#runtime = options.runtime;
    this.#lookupHashes = options.lookupHashes;
  }

  /**
   * Replace one client's contribution to the buffer with the entries it currently holds.
   *
   * @returns the keys no client carries any more, for the caller to reclaim from the index.
   * Unchanged entries keep their sequence, so they are not re-emitted.
   */
  submit(clientId: string, entries: readonly RegistryEntry[]): { removed: string[]; changed: number } {
    const seen = new Set<string>();
    let changed = 0;
    for (const entry of entries) {
      seen.add(entry.key);
      const hash = contentHash(entry.objectJson);
      const existing = this.#entries.get(entry.key);
      if (existing?.hash === hash) {
        existing.owners.add(clientId);
        continue;
      }
      let data: ObjectJSON;
      try {
        data = JSON.parse(entry.objectJson) as ObjectJSON;
      } catch (err) {
        log.warn('Failed to parse registry entry for indexing', { key: entry.key, err });
        continue;
      }
      this.#entries.set(entry.key, {
        key: entry.key,
        json: entry.objectJson,
        hash,
        data,
        seq: ++this.#seq,
        updatedAt: Date.now(),
        owners: (existing?.owners ?? new Set<string>()).add(clientId),
      });
      changed++;
    }

    const removed: string[] = [];
    for (const [key, entry] of this.#entries) {
      if (seen.has(key)) {
        continue;
      }
      entry.owners.delete(clientId);
      if (entry.owners.size === 0) {
        removed.push(key);
      }
    }
    for (const key of removed) {
      this.#entries.delete(key);
      this.#persistedHashes.delete(key);
    }

    return { removed, changed };
  }

  /** Entry keys any client currently holds — what a reconciliation compares the index against. */
  get keys(): ReadonlySet<string> {
    return new Set(this.#entries.keys());
  }

  getChangedObjects(
    _ctx: Context,
    cursors: DataSourceCursor[],
    opts?: { limit?: number },
  ): Effect.Effect<{ objects: IndexerObject[]; cursors: DataSourceCursor[] }> {
    return Effect.gen({ self: this }, function* () {
      const from = this.#readCursor(cursors);
      const pending = [...this.#entries.values()].filter((entry) => entry.seq > from).sort((a, b) => a.seq - b.seq);
      if (pending.length === 0) {
        return { objects: [], cursors: [this.#makeCursor(this.#seq)] };
      }

      // Entries first seen this session may already be indexed from a previous one, byte for byte.
      // One (chunked) query decides that for everything pending; afterwards the in-memory digest
      // comparison in `submit` is enough and the probe never runs for those keys again.
      const unprobed = pending.map((entry) => entry.key).filter((key) => !this.#persistedHashes.has(key));
      if (unprobed.length > 0) {
        const persisted = yield* this.#lookupHashes(unprobed);
        for (const key of unprobed) {
          this.#persistedHashes.set(key, persisted.get(key) ?? null);
        }
      }

      // The limit caps what is *emitted*, not what is examined: a skipped entry costs nothing to
      // walk past, and stopping the walk at the limit would leave a restart — where a whole
      // already-indexed registry is skipped — advancing the cursor by nothing and never reaching
      // the entries behind it.
      const limit = opts?.limit ?? Infinity;
      const objects: IndexerObject[] = [];
      let lastExamined = pending[0].seq;
      for (const entry of pending) {
        if (objects.length >= limit) {
          break;
        }
        lastExamined = entry.seq;
        if (this.#persistedHashes.get(entry.key) === entry.hash) {
          continue;
        }
        objects.push({
          spaceId: REGISTRY_SPACE_ID,
          queueId: null,
          queueNamespace: null,
          documentId: null,
          registryKey: entry.key,
          contentHash: entry.hash,
          recordId: null,
          data: entry.data,
          createdAt: null,
          updatedAt: entry.updatedAt,
        });
      }

      // The cursor covers everything examined, skipped entries included: a skip means the row
      // already holds this snapshot, so re-offering it on the next pass would spin forever.
      return { objects, cursors: [this.#makeCursor(lastExamined)] };
    }).pipe(
      RuntimeProvider.provide(this.#runtime),
      Effect.withSpan('RegistryDataSource.getChangedObjects'),
      Effect.orDie,
    );
  }

  #makeCursor(seq: number): DataSourceCursor {
    return { spaceId: null, resourceId: this.sourceName, cursor: `${this.#sessionId}:${seq}` };
  }

  /**
   * The sequence the given cursors resume from — zero unless a cursor was issued by this session's
   * sequence, since a durable cursor from a previous process names positions this one will reuse.
   */
  #readCursor(cursors: DataSourceCursor[]): number {
    for (const cursor of cursors) {
      if (typeof cursor.cursor !== 'string') {
        continue;
      }
      const separator = cursor.cursor.lastIndexOf(':');
      if (separator === -1 || cursor.cursor.slice(0, separator) !== this.#sessionId) {
        continue;
      }
      const seq = Number(cursor.cursor.slice(separator + 1));
      if (Number.isSafeInteger(seq) && seq >= 0) {
        return seq;
      }
    }
    return 0;
  }
}
