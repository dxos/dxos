//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as SqlClient from 'effect/sql/SqlClient';
import type * as SqlError from 'effect/sql/SqlError';

import { type Context } from '@dxos/context';
import { ATTR_META, type ObjectJSON } from '@dxos/echo/internal';
import { RuntimeProvider } from '@dxos/effect';
import {
  type DataSourceCursor,
  type IndexDataSource,
  type IndexerObject,
  ORIGIN_REGISTRY,
  REGISTRY_SPACE_ID,
  type RegistryIdentity,
  contentHash,
} from '@dxos/index-core';
import { EID, EntityId } from '@dxos/keys';
import { log } from '@dxos/log';

/**
 * The name and version a registry row is filed under, read from the entity's own metadata.
 *
 * The entity is the authority on what it is called, so nothing but its JSON is needed to file it:
 * `meta.key` and `meta.version` are what the in-process registry keyed it by — types included,
 * which carry their typename and version there too. An entity with no key of its own is filed
 * under its identifier EID, which is unique and never collides with a DXN.
 */
const registryIdentity = (data: ObjectJSON): RegistryIdentity => {
  const meta = data[ATTR_META];
  const metaKey = typeof meta?.key === 'string' && meta.key !== '' ? meta.key : undefined;
  if (metaKey === undefined) {
    return { name: EID.make({ entityId: EntityId.make(data.id) }), version: '' };
  }
  // Canonicalised to the DXN form a lookup key splits into, since a meta key may be written either
  // bare or prefixed and the two have to land on one name for an unversioned lookup to match.
  const name = metaKey.startsWith('dxn:') ? metaKey : `dxn:${metaKey}`;
  return { name, version: typeof meta?.version === 'string' ? meta.version : '' };
};

/**
 * The entity behind a contribution, parsed on first read and kept.
 *
 * The content was validated when its digest was first filed, so this cannot be reached with
 * anything unparseable — but it is written defensively rather than asserted, since the cost of
 * being wrong is a thrown error inside an index pass.
 */
const bodyOf = (contribution: Contribution): ObjectJSON | undefined => {
  if (contribution.data !== undefined) {
    return contribution.data;
  }
  try {
    const parsed: unknown = JSON.parse(contribution.json);
    if (isIndexableObject(parsed)) {
      contribution.data = parsed;
      return parsed;
    }
  } catch {}
  return undefined;
};

/** The buffer's handle for an identity — the same string the index engine reclaims a row by. */
const identityKey = ({ name, version }: RegistryIdentity): string => (version === '' ? name : `${name}:${version}`);

/**
 * One entity as the client registered it.
 */
export type RegistryEntry = {
  /** ECHO JSON of the entity; the host derives its name and version from the metadata inside. */
  objectJson: string;
};

export type RegistryDataSourceOptions = {
  runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient>;
  /** The persisted registry index, read once per session; supplied by the index engine. */
  listPersisted: () => Effect.Effect<
    readonly { name: string; version: string; contentHash: string | null }[],
    SqlError.SqlError
  >;
};

/** One client's registration of a key. */
type Contribution = {
  json: string;
  hash: string;
  /**
   * The parsed entity, absent until something needs the body.
   *
   * A boot re-offers a registry the index already holds byte for byte, and those entries are
   * skipped on their digest before the body is ever read — so parsing them would be work done
   * only to throw away.
   */
  data?: ObjectJSON;
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
 * marked by `origin = 'registry'`, which is what keeps them out of every space-scoped read.
 *
 * Four things decide what an update pass sees:
 *
 * - **Identity is the entry key, not the object id.** A key carries the version, so `…:0.1.0` and
 *   `…:0.2.0` are separate rows while a re-registration of one version replaces that row: last
 *   registered wins, even when the new entity is a different object.
 * - **Deduplication is by digest, throughout.** {@link prime} reads the persisted digests once, so
 *   a boot recognises an entry the index already holds without parsing it or querying for it; a
 *   re-push of an unchanged entity does not advance its sequence and never enters the pipeline.
 *   A restart over an unchanged registry therefore costs one scan rather than a re-index.
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
  readonly #listPersisted: RegistryDataSourceOptions['listPersisted'];
  readonly #sessionId = crypto.randomUUID();

  /** Union of every connected client's registry, keyed by entry key. */
  readonly #entries = new Map<string, BufferedEntry>();

  /**
   * Identity per snapshot digest — a pure content-to-identity cache.
   *
   * Lets an entry skip `JSON.parse`: the identity is read out of the entity's own metadata, so
   * identical content always resolves to the same key. Seeded from the persisted index by
   * {@link prime}, which is what keeps an unchanged boot from parsing the whole registry, and
   * extended whenever content is parsed for the first time.
   */
  readonly #identityByHash = new Map<string, string>();

  /**
   * Persisted digest per entry key as of {@link prime}; absent where the key has no row.
   *
   * Read once rather than probed per pass: one update pass calls {@link getChangedObjects} once
   * per dependent index, and a probe whose result was discarded would report "no row" on the
   * second call and re-index an entry the first call had just skipped. Only ever written from
   * that read, never from an emit — a write that rolls back leaves its cursor behind too, and the
   * entry must still look un-indexed when the next pass re-offers it.
   */
  readonly #persistedHashes = new Map<string, string | null>();

  #primed = false;

  #seq = 0;

  constructor(options: RegistryDataSourceOptions) {
    this.#runtime = options.runtime;
    this.#listPersisted = options.listPersisted;
  }

  /**
   * Read the persisted registry index once, before the first snapshot is folded in.
   *
   * The whole point of the boot path: a client that starts up re-offers a registry that is
   * already indexed byte for byte, and without this every entry would be parsed to find its
   * identity and then probed to find its digest. One scan answers both for all of them.
   */
  prime(): Effect.Effect<void> {
    return Effect.gen({ self: this }, function* () {
      if (this.#primed) {
        return;
      }
      const rows = yield* this.#listPersisted();
      for (const row of rows) {
        const key = identityKey(row);
        this.#persistedHashes.set(key, row.contentHash);
        if (row.contentHash !== null) {
          this.#identityByHash.set(row.contentHash, key);
        }
      }
      this.#primed = true;
    }).pipe(
      RuntimeProvider.provide(this.#runtime),
      // A failed read leaves the source unprimed rather than half-primed: every entry then takes
      // the parse-and-emit path, which is slower but never skips a write the index still needs.
      Effect.catchCause((cause) => Effect.sync(() => log.warn('Failed to read the persisted registry', { cause }))),
    );
  }

  /**
   * Whether {@link prime} has read the persisted registry.
   *
   * False after a failed read, where {@link persistedKeys} is empty for want of an answer rather
   * than because the index is: reconciling against it would conclude that nothing is orphaned and
   * retire the one pass that could ever reclaim the previous session's rows.
   */
  get primed(): boolean {
    return this.#primed;
  }

  /** Entry keys the index already holds, as of {@link prime} — what a reconciliation reclaims against. */
  get persistedKeys(): ReadonlySet<string> {
    return new Set(this.#persistedHashes.keys());
  }

  /**
   * Drop the record of what the index holds for these keys, once their rows are actually gone.
   *
   * {@link getChangedObjects} skips an entry whose digest matches the persisted one, so a key
   * reclaimed from the index while its digest stays here is never re-emitted: re-registering the
   * same content later would be recognised as already indexed and silently dropped.
   */
  forgetPersisted(keys: Iterable<string>): void {
    for (const key of keys) {
      this.#persistedHashes.delete(key);
    }
  }

  /**
   * Replace one client's contribution to the buffer with the entries it currently holds.
   *
   * Resolved in full before anything is filed, so that two entities sharing one identity collapse
   * to the last of them rather than each overwriting the other: filing both would leave the
   * contribution flipping on every push, and a byte-identical re-push would report a change.
   *
   * @returns the keys no client carries any more, for the caller to reclaim from the index.
   * Unchanged entries keep their sequence, so they are not re-emitted.
   */
  submit(clientId: string, entries: readonly RegistryEntry[]): { removed: string[]; changed: number } {
    const resolved = new Map<string, { json: string; hash: string; data: ObjectJSON | undefined }>();
    for (const entry of entries) {
      const hash = contentHash(entry.objectJson);

      // The identity lives inside the JSON, but parsing the whole registry on every push is what a
      // snapshot protocol does most of the time — the common push is byte-identical to the last
      // one, and at boot it is byte-identical to what the index already holds. A digest already
      // seen, here or on disk via `prime`, names the identity it resolved to without parsing
      // again; only content nobody has filed before reaches the parse below.
      const known = this.#identityByHash.get(hash);
      if (known !== undefined) {
        resolved.set(known, { json: entry.objectJson, hash, data: undefined });
        continue;
      }

      // An entry the indexer cannot file has no identity to be filed under, and so cannot count as
      // carried by this client — marking it would let a malformed replacement preserve the
      // client's previous contribution, which the reconciliation would then never drop. Only this
      // path can reject an entry, which is why the fast path above needs no validation of its
      // own: a digest is only ever filed for content that passed here.
      let parsed: unknown;
      try {
        parsed = JSON.parse(entry.objectJson);
      } catch (err) {
        log.warn('Failed to parse registry entry for indexing', { clientId, err });
        continue;
      }
      if (!isIndexableObject(parsed)) {
        log.warn('Ignoring registry entry that is not a well-formed object', { clientId });
        continue;
      }
      const key = identityKey(registryIdentity(parsed));
      this.#identityByHash.set(hash, key);
      resolved.set(key, { json: entry.objectJson, hash, data: parsed });
    }

    let changed = 0;
    for (const [key, { json, hash, data }] of resolved) {
      if (this.#file(clientId, key, json, hash, data)) {
        changed++;
      }
    }

    const removed: string[] = [];
    for (const [key, entry] of this.#entries) {
      if (resolved.has(key) || !entry.contributions.has(clientId)) {
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

  /**
   * Record one client's contribution to an identity.
   *
   * @param data the parsed entity when the caller already had it; left out on the digest-matched
   * path, where nothing has been parsed and — for an entry the index already holds — nothing will
   * be, since {@link getChangedObjects} skips it before ever reading the body.
   * @returns whether the buffer changed, and so whether an index pass is owed.
   */
  #file(clientId: string, key: string, json: string, hash: string, data: ObjectJSON | undefined): boolean {
    const existing = this.#entries.get(key);
    if (existing?.contributions.get(clientId)?.hash === hash) {
      return false;
    }

    const contribution: Contribution = { json, hash, data, seq: ++this.#seq, updatedAt: Date.now() };
    if (existing === undefined) {
      this.#entries.set(key, { key, contributions: new Map([[clientId, contribution]]), active: contribution });
    } else {
      existing.contributions.set(clientId, contribution);
      existing.active = contribution;
    }

    // Kept only while it still describes the row: a reading taken before this write is stale the
    // moment the content differs from it, and a later push returning the key to exactly that
    // content would then be skipped as already indexed when the row does not carry it. Matching
    // content is the boot case — the row already holds this, so there is nothing to invalidate.
    if (this.#persistedHashes.get(key) !== hash) {
      this.#persistedHashes.delete(key);
    }
    return true;
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
        // Re-read through the map rather than trusting the snapshot taken above: the write this
        // batch feeds lands in a later transaction, and a client's push in between can unregister
        // a key or promote another client's registration. Emitting the superseded object would
        // write a row that the push that reclaimed it has already stopped looking for.
        const live = this.#entries.get(entry.key);
        if (live === undefined || live.active !== entry.active) {
          continue;
        }
        lastExamined = entry.active.seq;
        if (this.#persistedHashes.get(entry.key) === entry.active.hash) {
          continue;
        }
        // The first read of the body for an entry that took the digest-matched path into the
        // buffer and then turned out to need indexing after all.
        const data = bodyOf(entry.active);
        if (data === undefined) {
          continue;
        }
        objects.push({
          spaceId: REGISTRY_SPACE_ID,
          queueId: null,
          queueNamespace: null,
          documentId: null,
          origin: ORIGIN_REGISTRY,
          ...registryIdentity(data),
          contentHash: entry.active.hash,
          recordId: null,
          data,
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
