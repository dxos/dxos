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
import { EntityId } from '@dxos/keys';
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

/** One client's registration of a key. */
type Contribution = {
  json: string;
  hash: string;
  data: ObjectJSON;
  /** Registration order within this session; the cursor names a value of this sequence. */
  seq: number;
  updatedAt: number;
};

/**
 * A key's registrations, one per client that carries it.
 *
 * Kept per client rather than as a single value with an owner set: two clients may register
 * different content under one key, and collapsing them would leave the loser's content indexed
 * after the winner unregisters, with no client left that could correct it.
 */
type BufferedEntry = {
  key: string;
  /** Keyed by client id; the entry lives while any contribution remains. */
  contributions: Map<string, Contribution>;
  /** The contribution currently indexed — the one registered last. */
  active: Contribution;
};

/** The contribution with the highest sequence — the one registered last wins. */
const latestContribution = (contributions: Iterable<Contribution>): Contribution | undefined => {
  let latest: Contribution | undefined;
  for (const contribution of contributions) {
    if (latest === undefined || contribution.seq > latest.seq) {
      latest = contribution;
    }
  }
  return latest;
};

/**
 * Whether a parsed registry snapshot is shaped like an entity the indexer can file.
 *
 * `objectJson` crosses the wire as an opaque string, so the RPC schema cannot check its contents,
 * and `ObjectJSON` is a structural interface with an open index signature — there is no Effect
 * schema to decode it against. The indexer only ever reads the entity id and the `@`-prefixed
 * attributes, so an id it can key a row by is what has to hold.
 */
const isIndexableObject = (value: unknown): value is ObjectJSON => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  if (!('id' in value)) {
    return false;
  }
  const id: unknown = value.id;
  return typeof id === 'string' && EntityId.isValid(id);
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
      // An empty key marks an ordinary row in `objectMeta`, so one here would address the whole
      // non-registry index. The RPC schema rejects it too; this is the host's own guard.
      if (entry.key === '') {
        log.warn('Ignoring registry entry with an empty key', { clientId });
        continue;
      }
      const hash = contentHash(entry.objectJson);
      const existing = this.#entries.get(entry.key);
      if (existing?.contributions.get(clientId)?.hash === hash) {
        seen.add(entry.key);
        continue;
      }

      // A key counts as carried by this client only once its entry is one the indexer can file.
      // Marking it before the checks below would let a malformed replacement preserve the
      // client's previous contribution, which the reconciliation would then never drop.
      let parsed: unknown;
      try {
        parsed = JSON.parse(entry.objectJson);
      } catch (err) {
        log.warn('Failed to parse registry entry for indexing', { key: entry.key, err });
        continue;
      }
      if (!isIndexableObject(parsed)) {
        log.warn('Ignoring registry entry that is not a well-formed object', { key: entry.key });
        continue;
      }
      seen.add(entry.key);

      const contribution: Contribution = {
        json: entry.objectJson,
        hash,
        data: parsed,
        seq: ++this.#seq,
        updatedAt: Date.now(),
      };
      if (existing === undefined) {
        this.#entries.set(entry.key, {
          key: entry.key,
          contributions: new Map([[clientId, contribution]]),
          active: contribution,
        });
      } else {
        existing.contributions.set(clientId, contribution);
        existing.active = contribution;
      }
      // The persisted digest read for this key describes the row as it was before this write, and
      // a later push may return the key to exactly that content — a comparison against the stale
      // reading would then skip a change the row does not yet carry.
      this.#persistedHashes.delete(entry.key);
      changed++;
    }

    const removed: string[] = [];
    for (const [key, entry] of this.#entries) {
      if (seen.has(key) || !entry.contributions.has(clientId)) {
        continue;
      }
      entry.contributions.delete(clientId);
      const survivor = latestContribution(entry.contributions.values());
      if (survivor === undefined) {
        removed.push(key);
        continue;
      }
      if (survivor !== entry.active) {
        // The client that had registered last is gone, so the newest remaining registration takes
        // over. It needs a fresh sequence: its own is behind every cursor that already passed it.
        const promoted: Contribution = { ...survivor, seq: ++this.#seq };
        for (const [owner, contribution] of entry.contributions) {
          if (contribution === survivor) {
            entry.contributions.set(owner, promoted);
          }
        }
        entry.active = promoted;
        this.#persistedHashes.delete(key);
        changed++;
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
      const pending = [...this.#entries.values()]
        .filter((entry) => entry.active.seq > from)
        .sort((left, right) => left.active.seq - right.active.seq);
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
      let lastExamined = pending[0].active.seq;
      for (const entry of pending) {
        if (objects.length >= limit) {
          break;
        }
        // Re-read through the map: the digest probe above suspends, and a snapshot arriving in that
        // window can unregister a key or promote another client's registration. Emitting the
        // superseded object would write a row that the pass that deleted it can no longer reclaim.
        const live = this.#entries.get(entry.key);
        if (live === undefined || live.active !== entry.active) {
          continue;
        }
        lastExamined = entry.active.seq;
        if (this.#persistedHashes.get(entry.key) === entry.active.hash) {
          continue;
        }
        objects.push({
          spaceId: REGISTRY_SPACE_ID,
          queueId: null,
          queueNamespace: null,
          documentId: null,
          registryKey: entry.key,
          contentHash: entry.active.hash,
          recordId: null,
          data: entry.active.data,
          createdAt: null,
          updatedAt: entry.active.updatedAt,
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
