//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { type DocumentId } from '@automerge/automerge-repo';

import { type Context } from '@dxos/context';
import { type DatabaseDirectory, type EntityStructure, PROPERTY_ID } from '@dxos/echo-protocol';
import { mergeCandidates, resolveMergeRedirect } from '@dxos/echo/internal';
import { type EntityMeta } from '@dxos/index-core';
import { type EntityId, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

/**
 * The document surface a merge needs — structurally satisfied by the host's `DocumentLease`
 * (whose disposal the merge honors) and by a bare `DocHandle` in tests.
 */
export type MergeDocumentRef = {
  readonly documentId: DocumentId;
  doc(): A.Doc<DatabaseDirectory>;
  change(callback: A.ChangeFn<DatabaseDirectory>): void;
  [Symbol.dispose]?: () => void;
};

export type ConvergenceKeyMergerDeps = {
  loadDoc: (ctx: Context, documentId: DocumentId) => Promise<MergeDocumentRef | null>;

  /**
   * Persist a document's pending changes durably. Winner and loser live in different documents
   * with no cross-document write ordering, so the merge flushes the winner's folded data before
   * writing any tombstone whose watermark claims that fold happened.
   */
  flushDoc: (ctx: Context, documentId: DocumentId) => Promise<void>;

  /**
   * Detection point lookup (`IndexEngine.queryByConvergenceKeys`), already bound to the host
   * runtime. Promise-typed so tests can supply rows without a database.
   */
  queryByConvergenceKeys: (spaceId: SpaceId, convergenceKeys: readonly string[]) => Promise<readonly EntityMeta[]>;
};

export type ConvergenceKeyMergeResult = {
  /** Duplicate groups that required writes (a merge or a late-edit fold). */
  mergedGroups: number;

  /** Keys serviced to completion, per space — safe to clear from the durable intent log. */
  serviced: Map<SpaceId, Set<string>>;
};

/**
 * Merges convergence-key duplicates surfaced by the indexing intent log — the worker-side trigger.
 *
 * The merge operates on the raw document structures via the storage-independent core in
 * `@dxos/echo/internal`; the writes replicate to clients like any other change, and the
 * `documentsSaved` event re-indexes the tombstones, which is what removes the losers from query
 * results everywhere.
 */
export class ConvergenceKeyMerger {
  readonly #deps: ConvergenceKeyMergerDeps;

  constructor(deps: ConvergenceKeyMergerDeps) {
    this.#deps = deps;
  }

  /**
   * Merge every duplicate group among the given pending keys.
   *
   * Runs after the index engine processes changed documents, which is the earliest a duplicate
   * can exist on this device: duplicates are born from replication, and a replicated write is
   * exactly what lands here. Detection is a point lookup on only the pending keys, so the cost
   * is proportional to writes that carry one — nil for everything else — and no client, query,
   * or full scan is involved.
   *
   * Already-redirected entities that re-index — a straggler peer's late edits replicating onto a
   * tombstone, or a loser resurrected by `db.add` — are serviced too: their post-merge edits are
   * folded into the winner and the tombstone is re-asserted, which is what makes `mergedInto`
   * sticky and the convergence argument hold without any client-side pass.
   *
   * Failure containment: a key whose group throws is reported un-serviced (it stays in the intent
   * log and the next pass retries it) without blocking the rest of the batch. A group member whose
   * document cannot be loaded is merged around — the merge over the loadable subset is safe, and
   * the missing document's eventual arrival is itself an indexed write that re-presents the key.
   */
  async mergeDuplicates(
    ctx: Context,
    convergenceKeys: ReadonlyMap<SpaceId, ReadonlySet<string>>,
  ): Promise<ConvergenceKeyMergeResult> {
    let mergedGroups = 0;
    const serviced = new Map<SpaceId, Set<string>>();
    for (const [spaceId, keys] of convergenceKeys) {
      if (keys.size === 0) {
        continue;
      }

      let rows;
      try {
        rows = await this.#deps.queryByConvergenceKeys(spaceId, [...keys]);
      } catch (err) {
        log.warn('convergence-key detection failed; keys stay pending', { spaceId, keys: keys.size, err });
        continue;
      }

      const groups = new Map<string, { objectId: EntityId; documentId: string }[]>();
      for (const row of rows) {
        if (!row.convergenceKey || !row.documentId) {
          continue;
        }
        const group = groups.get(row.convergenceKey) ?? [];
        if (!group.some(({ objectId }) => objectId === row.objectId)) {
          group.push({ objectId: row.objectId, documentId: row.documentId });
        }
        groups.set(row.convergenceKey, group);
      }

      const servicedKeys = new Set<string>();
      serviced.set(spaceId, servicedKeys);
      for (const convergenceKey of keys) {
        const group = groups.get(convergenceKey);
        if (group === undefined || group.length < 2) {
          // A lone row, or rows that no longer carry the key — nothing to merge.
          servicedKeys.add(convergenceKey);
          continue;
        }
        try {
          if (await this.mergeGroup(ctx, convergenceKey, group)) {
            mergedGroups++;
          }
          servicedKeys.add(convergenceKey);
        } catch (err) {
          log.warn('convergence-key merge group failed; will retry', { spaceId, convergenceKey, err });
        }
      }
    }

    if (mergedGroups > 0) {
      log('merged convergence-key duplicates', { groups: mergedGroups });
    }
    return { mergedGroups, serviced };
  }

  /**
   * Merge one convergence-key group: the live candidates fold into the minimum-id winner, and
   * already-redirected members get their late edits folded and their tombstones re-asserted.
   *
   * Public as the unit under test — `mergeDuplicates` adds detection and failure containment
   * around it.
   */
  async mergeGroup(
    ctx: Context,
    convergenceKey: string,
    group: readonly { objectId: EntityId; documentId: string }[],
  ): Promise<boolean> {
    // Load phase: awaited doc loads, during which replicated changes are free to land — nothing
    // has been read yet. The index row is derived state and can trail the truth, so everything is
    // re-verified against the documents below.
    const handles = new Map<EntityId, MergeDocumentRef>();
    try {
      for (const { objectId, documentId } of group) {
        const handle = await this.#deps.loadDoc(ctx, documentId as DocumentId);
        if (!handle) {
          continue;
        }
        if (handles.has(objectId)) {
          handle[Symbol.dispose]?.();
          continue;
        }
        handles.set(objectId, handle);
      }

      // Classification reads current state, and `#mergeCandidates` computes the merge from these
      // same reads synchronously — replicated changes apply through the event loop, so nothing can
      // land between a read and the write derived from it. `#foldRedirected` re-reads on its own:
      // by the time it runs, awaits inside `#mergeCandidates` may have let changes land — including
      // the redirects the merge itself just wrote, which a fold must follow to their live end.
      const candidates: GroupMember[] = [];
      const redirectedIds: EntityId[] = [];
      for (const [objectId, handle] of handles) {
        const entity = _readEntity(handle, objectId, convergenceKey);
        if (!entity) {
          continue;
        }
        if (entity.system?.mergedInto !== undefined) {
          redirectedIds.push(objectId);
        } else if (!entity.system?.deleted) {
          // A user-deleted entity without a redirect is neither: deletion is respected, not merged.
          candidates.push({ objectId, handle, entity });
        }
      }

      let changed = candidates.length >= 2 && (await this.#mergeCandidates(ctx, convergenceKey, candidates));
      for (const objectId of redirectedIds) {
        changed = (await this.#foldRedirected(ctx, objectId, handles, convergenceKey)) || changed;
      }
      return changed;
    } finally {
      // Leased documents must be returned or the host keeps them resident forever.
      for (const handle of handles.values()) {
        handle[Symbol.dispose]?.();
      }
    }
  }

  /**
   * Merge live duplicates: fold every loser's state into the minimum-id winner, flush the winner
   * durably, then redirect and tombstone the losers.
   *
   * The member reads, the merge computation, the losers' watermark heads, and the winner write all
   * belong to one synchronous block, so the tombstones' `mergedAtHeads` cover exactly the state
   * the merge folded — an edit landing later is above the watermark and reachable by a later fold.
   * The only await is the durability flush between the winner write and the loser tombstones; the
   * loser callbacks re-verify eligibility after it.
   */
  async #mergeCandidates(ctx: Context, convergenceKey: string, candidates: readonly GroupMember[]): Promise<boolean> {
    const result = mergeCandidates(
      candidates.map(({ objectId, entity }) => ({
        id: objectId,
        convergenceKey,
        data: (entity.data ?? {}) as Record<string, unknown>,
        keys: entity.meta?.keys,
      })),
    );

    const byId = new Map(candidates.map((member) => [member.objectId, member]));
    const winner = byId.get(result.winner);
    if (!winner) {
      return false;
    }

    // Transitively closed: a loser that already absorbed others hands those on.
    const absorbed = new Set<EntityId>(winner.entity.system?.mergedFrom ?? []);
    for (const loserId of result.losers) {
      absorbed.add(loserId);
      for (const inherited of byId.get(loserId)?.entity.system?.mergedFrom ?? []) {
        absorbed.add(inherited);
      }
    }

    // Watermark heads, captured from the same doc states the merge was computed over.
    const loserHeads = new Map<EntityId, string[]>();
    for (const loserId of result.losers) {
      const loser = byId.get(loserId);
      if (loser) {
        loserHeads.set(loserId, A.getHeads(loser.handle.doc()));
      }
    }

    // The change callback runs in the same tick as the reads the merge was computed from, so the
    // re-checks are a backstop against out-of-band mutation, not the concurrency mechanism.
    let applied = false;
    winner.handle.change((doc: DatabaseDirectory) => {
      const entity = doc.objects?.[winner.objectId];
      if (
        !entity ||
        entity.system?.mergedInto !== undefined ||
        entity.system?.deleted ||
        entity.meta?.convergenceKey !== convergenceKey
      ) {
        return;
      }
      // `x ??= y` evaluates to the plain right-hand value, not the proxy the document wraps it in,
      // so every container is re-read through the entity after assignment — mutations on the alias
      // of the right-hand value would go nowhere.
      if (entity.data === undefined) {
        entity.data = {};
      }
      for (const [field, value] of Object.entries(result.data)) {
        // Per-field writes, and only where the value differs, so a concurrent edit to a field the
        // merge never touched keeps its last-write-wins outcome.
        if (!_jsonEqual(entity.data[field], value)) {
          entity.data[field] = _clone(value);
        }
      }
      if (entity.meta === undefined) {
        entity.meta = { keys: [] };
      }
      const keys = entity.meta.keys;
      for (const key of result.keys) {
        if (!keys.some((existing) => existing.source === key.source && existing.id === key.id)) {
          keys.push(_clone(key));
        }
      }
      if (entity.system === undefined) {
        entity.system = {};
      }
      // Append to the existing list rather than assigning a new one: concurrent assignments are
      // whole-list conflicts and LWW would drop one peer's ids; concurrent inserts both survive,
      // and reads deduplicate.
      if (entity.system.mergedFrom === undefined) {
        entity.system.mergedFrom = [];
      }
      const mergedFrom = entity.system.mergedFrom;
      for (const id of [...absorbed].sort()) {
        if (!mergedFrom.includes(id)) {
          mergedFrom.push(id);
        }
      }
      applied = true;
    });
    if (!applied) {
      // Tombstoning the losers without having folded their state would strand it.
      return false;
    }

    // Make the fold durable before any tombstone can be: a crash that persists a loser's
    // watermark without the winner's folded data would strand the loser's state below a
    // watermark nothing re-reads.
    await this.#deps.flushDoc(ctx, winner.handle.documentId);

    // The flush is an await — re-read the winner before tombstoning against it. A deletion that
    // replicated in during it is respected: tombstoning the losers under a deleted winner would
    // make every copy invisible. The losers stay live and a later pass re-merges them.
    if (winner.handle.doc()?.objects?.[winner.objectId]?.system?.deleted) {
      return true;
    }

    for (const loserId of result.losers) {
      const loser = byId.get(loserId);
      const heads = loserHeads.get(loserId);
      if (!loser || !heads) {
        continue;
      }
      loser.handle.change((doc: DatabaseDirectory) => {
        const entity = doc.objects?.[loserId];
        // Changes that landed during the flush win: an existing redirect owns the watermark its
        // fold depends on; a changed key means this is no longer the entity that was merged; a
        // deletion is respected, not converted into a redirect.
        if (
          !entity ||
          entity.system?.mergedInto !== undefined ||
          entity.system?.deleted ||
          entity.meta?.convergenceKey !== convergenceKey
        ) {
          return;
        }
        if (entity.system === undefined) {
          entity.system = {};
        }
        entity.system.mergedInto = result.winner;
        entity.system.mergedAtHeads = [...heads];
        entity.system.deleted = true;
      });
    }

    // The durability rule's dual: returning marks the key serviced and lets the orchestrator clear
    // its durable intent, so the tombstones must be on disk first — an intent must never die before
    // the tombstone it claims exists.
    const flushedDocs = new Set([winner.handle.documentId]);
    for (const loserId of result.losers) {
      const loser = byId.get(loserId);
      if (loser && !flushedDocs.has(loser.handle.documentId)) {
        flushedDocs.add(loser.handle.documentId);
        await this.#deps.flushDoc(ctx, loser.handle.documentId);
      }
    }

    log('merged group', { convergenceKey, winner: result.winner, losers: result.losers });
    return true;
  }

  /**
   * Service an already-redirected entity: fold data edits made since its recorded watermark into
   * the surviving entity, and re-assert the tombstone.
   *
   * This is what makes the redirect durable. A peer offline during the merge keeps editing its
   * copy; those edits replicate onto the tombstone, re-index it, and land here — re-running the
   * field-wise merge could not rescue them (it prefers the smallest-id candidate, the winner).
   * And `db.add` un-deletes, so a restored loser would otherwise be a live duplicate that
   * detection ignores forever; re-tombstoning makes `mergedInto` sticky, with the restore's edits
   * carried to the winner by the same fold.
   *
   * Redirect resolution, the diff, the folded values, and the watermark all read the documents'
   * current state in one synchronous block: the fold can never write a value older than the heads
   * it advances the watermark to, and a redirect chain that collapsed earlier in this same pass is
   * followed to its live end. The watermark advances only when the fold write actually applied —
   * otherwise the edits stay above it for a later pass.
   */
  async #foldRedirected(
    ctx: Context,
    loserId: EntityId,
    handles: ReadonlyMap<EntityId, MergeDocumentRef>,
    convergenceKey: string,
  ): Promise<boolean> {
    const handle = handles.get(loserId);
    const doc = handle?.doc();
    const entity = doc?.objects?.[loserId];
    const mergedInto = entity?.system?.mergedInto;
    if (!handle || !doc || !entity || mergedInto === undefined || entity.meta?.convergenceKey !== convergenceKey) {
      return false;
    }
    const mergedAtHeads = _watermarkUnion(entity);

    const winnerId = resolveMergeRedirect(loserId, (id) => handles.get(id)?.doc()?.objects?.[id]?.system?.mergedInto);
    const winnerHandle = winnerId !== loserId ? handles.get(winnerId) : undefined;
    const winnerEntity = winnerHandle?.doc()?.objects?.[winnerId];
    // The chain's end must be live to fold into. Deleted → the edits wait above the watermark
    // until the winner is restored; still redirected (a non-decreasing edge stopped the walk) →
    // corrupt data, leave it alone.
    const winnerLive =
      winnerEntity !== undefined && winnerEntity.system?.mergedInto === undefined && !winnerEntity.system?.deleted;

    const currentHeads = A.getHeads(doc);
    let changedFields: string[] = [];
    if (mergedAtHeads !== undefined && winnerLive) {
      const prefix = ['objects', loserId, 'data'];
      const changed = new Set<string>();
      for (const patch of A.diff(doc, mergedAtHeads, currentHeads)) {
        if (patch.path.length > prefix.length && prefix.every((key, index) => patch.path[index] === key)) {
          changed.add(String(patch.path[prefix.length]));
        }
      }
      changedFields = [...changed].filter((field) => field !== PROPERTY_ID);
    }

    let applied = false;
    if (changedFields.length > 0 && winnerHandle !== undefined) {
      const loserData = (entity.data ?? {}) as Record<string, unknown>;
      winnerHandle.change((target: DatabaseDirectory) => {
        const targetEntity = target.objects?.[winnerId];
        if (!targetEntity || targetEntity.system?.mergedInto !== undefined || targetEntity.system?.deleted) {
          return;
        }
        if (targetEntity.data === undefined) {
          targetEntity.data = {};
        }
        for (const field of changedFields) {
          const value = loserData[field];
          if (value === undefined) {
            delete targetEntity.data[field];
          } else if (!_jsonEqual(targetEntity.data[field], value)) {
            targetEntity.data[field] = _clone(value);
          }
        }
        applied = true;
      });
    }

    if (applied && winnerHandle !== undefined) {
      // Durability order, as in `#mergeCandidates`: a watermark must never outlive the fold it
      // claims happened.
      await this.#deps.flushDoc(ctx, winnerHandle.documentId);
    }

    const needsTombstone = entity.system?.deleted !== true;
    if (!applied && !needsTombstone) {
      return false;
    }
    handle.change((target: DatabaseDirectory) => {
      const targetEntity = target.objects?.[loserId];
      // A concurrent redirect elsewhere owns the watermark now; leave it to that merge's fold.
      if (!targetEntity || targetEntity.system === undefined || targetEntity.system.mergedInto !== mergedInto) {
        return;
      }
      if (applied) {
        // Advance the watermark so the same edit is never folded twice.
        targetEntity.system.mergedAtHeads = [...currentHeads];
      }
      targetEntity.system.deleted = true;
    });
    // The durability rule's dual, as in `#mergeCandidates`: the watermark advance and re-asserted
    // tombstone must be on disk before the intent that claims this fold happened can be cleared.
    await this.#deps.flushDoc(ctx, handle.documentId);
    log('serviced redirected entity', {
      loserId,
      winnerId,
      foldedFields: applied ? changedFields : [],
      tombstoneReasserted: needsTombstone,
    });
    return true;
  }
}

type GroupMember = {
  objectId: EntityId;
  handle: MergeDocumentRef;

  /** Current entity state, read in the same synchronous block as the merge computed from it. */
  entity: EntityStructure;
};

/**
 * Read an entity's current state, or `undefined` when it is not a merge subject for this key.
 *
 * Objects only: relations and types index as document entities too, but merging a relation would
 * tombstone it without reconciling its endpoints, and merging a type would break schema
 * resolution for its instances. The kind is read leniently — throwing here would wedge the
 * indexing loop on one corrupt entity.
 */
const _readEntity = (
  handle: MergeDocumentRef,
  objectId: EntityId,
  convergenceKey: string,
): EntityStructure | undefined => {
  const entity = handle.doc()?.objects?.[objectId];
  if (!entity || (entity.system?.kind ?? 'object') !== 'object' || entity.meta?.convergenceKey !== convergenceKey) {
    return undefined;
  }
  return entity;
};

/**
 * The effective fold watermark: the stored `mergedAtHeads` unioned with every conflicting value
 * of that register.
 *
 * Peers merging the same group concurrently each record their own watermark; automerge keeps one
 * as the register value and the rest as conflicts. Diffing from the union means an edit *any*
 * peer already folded is never re-presented — a re-fold from a stale surviving watermark would
 * write the loser's old value over a newer edit made on the winner since.
 */
const _watermarkUnion = (entity: EntityStructure): string[] | undefined => {
  const system = entity.system;
  const stored = system?.mergedAtHeads;
  if (system === undefined || stored === undefined) {
    return undefined;
  }
  const hashes = new Set<string>();
  const collect = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const hash of value) {
        if (typeof hash === 'string') {
          hashes.add(hash);
        }
      }
    }
  };
  collect(stored);
  for (const conflicting of Object.values(A.getConflicts(system, 'mergedAtHeads') ?? {})) {
    collect(conflicting);
  }
  return [...hashes];
};

/**
 * Deep-copies a value read from one automerge document so it can be inserted into another —
 * materialized automerge values may be proxied, and a document must not hold another's nodes.
 */
const _clone = <T>(value: T): T => {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (value instanceof Uint8Array) {
    return new Uint8Array(value) as T;
  }
  // Long strings are stored as unmergeable raw strings; the generic branch would flatten one
  // into a `{ val }` map — silent corruption of the field.
  if (value instanceof A.RawString) {
    return new A.RawString(value.val) as T;
  }
  if (Array.isArray(value)) {
    return value.map(_clone) as T;
  }
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, _clone(entry)])) as T;
};

/**
 * Structural equality good enough for the write-only-if-different guard: a false negative costs
 * one redundant (idempotent) write, never a wrong value.
 */
const _jsonEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) {
    return true;
  }
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
};
