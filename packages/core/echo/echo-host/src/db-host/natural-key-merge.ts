//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { type DocHandle, type DocumentId } from '@automerge/automerge-repo';

import { type Context } from '@dxos/context';
import { Merge } from '@dxos/echo';
import { type DatabaseDirectory, type EntityStructure } from '@dxos/echo-protocol';
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
 * @returns The number of duplicate groups merged.
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
  const members: GroupMember[] = [];
  for (const { objectId, documentId } of group) {
    const handle = await loadDoc<DatabaseDirectory>(ctx, documentId as DocumentId);
    const entity = handle?.doc()?.objects?.[objectId];
    if (
      !entity ||
      entity.system?.deleted ||
      entity.system?.mergedInto !== undefined ||
      entity.meta?.naturalKey !== naturalKey
    ) {
      continue;
    }
    members.push({ objectId, handle: handle!, entity });
  }
  if (members.length < 2) {
    return false;
  }

  const result = Merge.merge(
    members.map(({ objectId, entity }) => ({
      id: objectId,
      naturalKey,
      data: (entity.data ?? {}) as Record<string, unknown>,
      keys: entity.meta?.keys,
    })),
  );

  const byId = new Map(members.map((member) => [member.objectId, member]));
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

  winner.handle.change((doc: DatabaseDirectory) => {
    const entity = doc.objects?.[winner.objectId];
    if (!entity) {
      return;
    }
    entity.data ??= {};
    for (const [field, value] of Object.entries(result.data)) {
      // Per-field writes, and only where the value differs, so a concurrent edit to a field the
      // merge never touched keeps its last-write-wins outcome.
      if (!_jsonEqual(entity.data[field], value)) {
        entity.data[field] = _clone(value);
      }
    }
    const meta = (entity.meta ??= { keys: [] });
    for (const key of result.keys) {
      if (!meta.keys.some((existing) => existing.source === key.source && existing.id === key.id)) {
        meta.keys.push(_clone(key));
      }
    }
    const system = (entity.system ??= {});
    system.mergedFrom = [...absorbed].sort();
  });

  for (const loserId of result.losers) {
    const loser = byId.get(loserId);
    if (!loser) {
      continue;
    }
    // Heads before the tombstone, so a straggler's later edits can be diffed and folded in.
    const heads = A.getHeads(loser.handle.doc());
    loser.handle.change((doc: DatabaseDirectory) => {
      const entity = doc.objects?.[loser.objectId];
      if (!entity) {
        return;
      }
      const system = (entity.system ??= {});
      system.mergedInto = result.winner;
      system.mergedAtHeads = [...heads];
      system.deleted = true;
    });
  }

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
