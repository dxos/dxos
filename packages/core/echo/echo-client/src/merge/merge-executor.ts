//
// Copyright 2026 DXOS.org
//

import { type Entity, Merge, Obj } from '@dxos/echo';
import { type EntityId } from '@dxos/keys';

import { getObjectCore } from '../echo-handler';

/**
 * What one merge pass did, for diagnostics and for asserting idempotence.
 */
export type MergePassResult = {
  /** One entry per natural key that had duplicates. */
  readonly merged: readonly {
    readonly naturalKey: string;
    readonly winner: EntityId;
    readonly losers: readonly EntityId[];
  }[];
};

/**
 * Apply the deterministic merge to every group of duplicates among `entities`.
 *
 * Being a pure function of the candidate set, this is safe to run redundantly: every peer runs
 * it on space open and they agree, and a second pass over the same entities is a no-op. Groups
 * of one are skipped, so a space with no duplicates costs one grouping pass and no writes.
 *
 * Writes only the fields whose values differ from the merged result, rather than replacing the
 * whole object — a whole-object replace would rewrite every field, so a concurrent edit to a
 * property the merge never touched would lose the last-write-wins race.
 */
export const mergeDuplicates = (entities: readonly Entity.Unknown[]): MergePassResult => {
  const byId = new Map<EntityId, Entity.Unknown>();
  for (const entity of entities) {
    byId.set(entity.id, entity);
  }

  const merged: {
    naturalKey: string;
    winner: EntityId;
    losers: readonly EntityId[];
  }[] = [];

  for (const [naturalKey, group] of Merge.findDuplicates(entities.map(Merge.candidateOf))) {
    const result = Merge.merge(group);
    const winner = byId.get(result.winner);
    if (!winner) {
      continue;
    }

    Obj.update(winner, (winner) => {
      for (const [field, value] of Object.entries(result.data)) {
        if ((winner as Record<string, unknown>)[field] !== value) {
          (winner as Record<string, unknown>)[field] = value;
        }
      }
      const meta = Obj.getMeta(winner);
      for (const key of result.keys) {
        if (!meta.keys.some((existing) => existing.source === key.source && existing.id === key.id)) {
          meta.keys.push(key);
        }
      }
    });

    for (const loserId of result.losers) {
      const loser = byId.get(loserId);
      if (!loser) {
        continue;
      }
      const core = getObjectCore(loser);
      // Record the heads before tombstoning, so a straggler's later edits can be folded in.
      core.setMergedInto(result.winner, core.getHeads());
      core.setDeleted(true);
    }

    merged.push({ naturalKey, winner: result.winner, losers: result.losers });
  }

  return { merged };
};

/**
 * Follow `system.mergedInto` from `start` to the entity that finally survives, resolving each hop
 * against `entities`.
 *
 * A merged-away entity keeps replicating rather than being erased, precisely so this works: a
 * reference that was never rewritten still reaches the winner.
 */
export const resolveMerged = (start: EntityId, entities: readonly Entity.Unknown[]): EntityId => {
  const byId = new Map<EntityId, Entity.Unknown>();
  for (const entity of entities) {
    byId.set(entity.id, entity);
  }

  return Merge.resolveRedirect(start, (id) => {
    const entity = byId.get(id);
    return entity ? getObjectCore(entity).getMergedInto() : undefined;
  });
};
