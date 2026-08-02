//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { type DocHandle, type DocumentId } from '@automerge/automerge-repo';

import { type Context } from '@dxos/context';
import { Merge } from '@dxos/echo';
import { type DatabaseDirectory, type EntityStructure, PROPERTY_ID } from '@dxos/echo-protocol';
import { RuntimeProvider } from '@dxos/effect';
import { type IndexEngine } from '@dxos/index-core';
import { type EntityId, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

export type NaturalKeyMergeContext = {
  indexEngine: IndexEngine;
  runtime: RuntimeProvider.RuntimeProvider<any>;
  loadDoc: <T>(ctx: Context, documentId: DocumentId) => Promise<DocHandle<T> | null>;
};

/**
 * Merge natural-key duplicates surfaced by an indexing batch — the worker-side trigger.
 *
 * Runs after the index engine processes changed documents, which is the earliest a duplicate can
 * exist on this device: duplicates are born from replication, and a replicated write is exactly
 * what lands here. Detection is a point lookup on only the natural keys present in the batch, so
 * the cost is proportional to writes that carry one — nil for everything else — and no client,
 * query, or full scan is involved.
 *
 * The merge itself operates on the raw document structures via the storage-independent core in
 * `@dxos/echo`'s `Merge` module; the writes replicate to clients like any other change, and the
 * `documentsSaved` event re-indexes the tombstones, which is what removes the losers from query
 * results everywhere.
 *
 * Already-redirected entities that re-index — a straggler peer's late edits replicating onto a
 * tombstone, or a loser resurrected by `db.add` — are serviced too: their post-merge edits are
 * folded into the winner and the tombstone is re-asserted, which is what makes `mergedInto`
 * sticky and the convergence argument hold without any client-side pass.
 *
 * @returns The number of duplicate groups that required writes (a merge or a late-edit fold).
 */
export const mergeNaturalKeyDuplicates = async (
  ctx: Context,
  naturalKeys: ReadonlyMap<SpaceId, ReadonlySet<string>>,
  { indexEngine, runtime, loadDoc }: NaturalKeyMergeContext,
): Promise<number> => {
  if (naturalKeys.size === 0) {
    return 0;
  }

  let mergedGroups = 0;
  for (const [spaceId, keys] of naturalKeys) {
    const rows = await indexEngine.queryByNaturalKeys(spaceId, [...keys]).pipe(RuntimeProvider.runPromise(runtime));

    const groups = new Map<string, { objectId: EntityId; documentId: string }[]>();
    for (const row of rows) {
      if (!row.naturalKey || !row.documentId) {
        continue;
      }
      const group = groups.get(row.naturalKey) ?? [];
      if (!group.some(({ objectId }) => objectId === row.objectId)) {
        group.push({ objectId: row.objectId, documentId: row.documentId });
      }
      groups.set(row.naturalKey, group);
    }

    for (const [naturalKey, group] of groups) {
      if (group.length < 2) {
        continue;
      }
      if (await _mergeGroup(ctx, naturalKey, group, loadDoc)) {
        mergedGroups++;
      }
    }
  }

  if (mergedGroups > 0) {
    log('merged natural-key duplicates', { groups: mergedGroups });
  }
  return mergedGroups;
};

type GroupMember = {
  objectId: EntityId;
  handle: DocHandle<DatabaseDirectory>;
  entity: EntityStructure;
};

const _mergeGroup = async (
  ctx: Context,
  naturalKey: string,
  group: readonly { objectId: EntityId; documentId: string }[],
  loadDoc: NaturalKeyMergeContext['loadDoc'],
): Promise<boolean> => {
  // Re-verify against the documents: the index row is derived state and can trail the truth —
  // an entity already merged away (or whose key changed) must not be merged again.
  const loaded = new Map<EntityId, GroupMember>();
  const candidates: GroupMember[] = [];
  const redirected: GroupMember[] = [];
  for (const { objectId, documentId } of group) {
    const handle = await loadDoc<DatabaseDirectory>(ctx, documentId as DocumentId);
    const entity = handle?.doc()?.objects?.[objectId];
    // Objects only: relations and types index as document entities too, but merging a relation
    // would tombstone it without reconciling its endpoints, and merging a type would break
    // schema resolution for its instances. Read the kind leniently — throwing here would wedge
    // the indexing loop on one corrupt entity.
    if (!entity || (entity.system?.kind ?? 'object') !== 'object' || entity.meta?.naturalKey !== naturalKey) {
      continue;
    }
    const member: GroupMember = { objectId, handle: handle!, entity };
    loaded.set(objectId, member);
    if (entity.system?.mergedInto !== undefined) {
      // Already merged away — not a candidate, but late edits (a straggler peer, or a restore)
      // may need folding into the winner, and the tombstone is sticky.
      redirected.push(member);
    } else if (!entity.system?.deleted) {
      // A user-deleted entity without a redirect is neither: deletion is respected, not merged.
      candidates.push(member);
    }
  }

  const merged = candidates.length >= 2 && _mergeCandidates(naturalKey, candidates);

  let folded = false;
  for (const loser of redirected) {
    folded = _foldRedirected(loser, loaded) || folded;
  }

  return merged || folded;
};

/**
 * Merge live duplicates: fold every loser's state into the minimum-id winner, then redirect and
 * tombstone the losers.
 */
const _mergeCandidates = (naturalKey: string, candidates: readonly GroupMember[]): boolean => {
  const result = Merge.merge(
    candidates.map(({ objectId, entity }) => ({
      id: objectId,
      naturalKey,
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

  // The verification snapshots above are separated from this write by awaited doc loads, during
  // which a replicated change may have landed — so the change callback re-checks the winner is
  // still a live candidate, and aborts the whole group if not (tombstoning the losers without
  // having folded their state would strand it).
  let applied = false;
  winner.handle.change((doc: DatabaseDirectory) => {
    const entity = doc.objects?.[winner.objectId];
    if (!entity || entity.system?.mergedInto !== undefined || entity.meta?.naturalKey !== naturalKey) {
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
    return false;
  }

  for (const loserId of result.losers) {
    const loser = byId.get(loserId);
    if (!loser) {
      continue;
    }
    // Heads before the tombstone, so a straggler's later edits can be diffed and folded in.
    const heads = A.getHeads(loser.handle.doc());
    loser.handle.change((doc: DatabaseDirectory) => {
      const entity = doc.objects?.[loser.objectId];
      // A redirect that landed concurrently wins — overwriting it would clobber the watermark
      // its fold depends on. The two winners share the key, so a later pass reconciles them.
      if (!entity || entity.system?.mergedInto !== undefined) {
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

  return true;
};

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
 */
const _foldRedirected = (loser: GroupMember, loaded: ReadonlyMap<EntityId, GroupMember>): boolean => {
  const mergedInto = loser.entity.system?.mergedInto;
  const mergedAtHeads = loser.entity.system?.mergedAtHeads;
  if (mergedInto === undefined) {
    return false;
  }

  const winnerId = Merge.resolveRedirect(loser.objectId, (id) => loaded.get(id)?.entity.system?.mergedInto);
  const winner = winnerId !== loser.objectId ? loaded.get(winnerId) : undefined;

  const doc = loser.handle.doc();
  const currentHeads = A.getHeads(doc);
  let changedFields: string[] = [];
  if (mergedAtHeads !== undefined && winner !== undefined && !winner.entity.system?.deleted) {
    const prefix = ['objects', loser.objectId, 'data'];
    const changed = new Set<string>();
    for (const patch of A.diff(doc, mergedAtHeads, currentHeads)) {
      if (patch.path.length > prefix.length && prefix.every((key, index) => patch.path[index] === key)) {
        changed.add(String(patch.path[prefix.length]));
      }
    }
    changedFields = [...changed].filter((field) => field !== PROPERTY_ID);
  }

  if (changedFields.length > 0 && winner !== undefined) {
    winner.handle.change((target: DatabaseDirectory) => {
      const entity = target.objects?.[winner.objectId];
      if (!entity || entity.system?.mergedInto !== undefined) {
        return;
      }
      if (entity.data === undefined) {
        entity.data = {};
      }
      for (const field of changedFields) {
        const value = (loser.entity.data as Record<string, unknown> | undefined)?.[field];
        if (value === undefined) {
          delete entity.data[field];
        } else if (!_jsonEqual(entity.data[field], value)) {
          entity.data[field] = _clone(value);
        }
      }
    });
  }

  const needsTombstone = loser.entity.system?.deleted !== true;
  if (changedFields.length === 0 && !needsTombstone) {
    return false;
  }
  loser.handle.change((target: DatabaseDirectory) => {
    const entity = target.objects?.[loser.objectId];
    // A concurrent redirect elsewhere owns the watermark now; leave it to that merge's fold.
    if (!entity || entity.system === undefined || entity.system.mergedInto !== mergedInto) {
      return;
    }
    if (changedFields.length > 0) {
      // Advance the watermark so the same edit is never folded twice.
      entity.system.mergedAtHeads = [...currentHeads];
    }
    entity.system.deleted = true;
  });
  return true;
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
