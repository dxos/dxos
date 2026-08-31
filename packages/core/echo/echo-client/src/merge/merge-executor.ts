//
// Copyright 2026 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';
import { PROPERTY_ID } from '@dxos/echo-protocol';
import { mergeCandidates, resolveMergeRedirect, toMergeCandidate } from '@dxos/echo/internal';
import { EID, type EntityId } from '@dxos/keys';

import { getObjectCore, isEchoObject } from '../echo-handler';

/**
 * What one merge pass did, for diagnostics and for asserting idempotence.
 */
export type MergePassResult = {
  /** One entry per convergence key that had duplicates. */
  readonly merged: readonly {
    readonly convergenceKey: string;
    readonly winner: EntityId;
    readonly losers: readonly EntityId[];
  }[];
};

/**
 * Apply the deterministic merge to every group of duplicates among `entities`.
 *
 * This is the client-side executor behind `db.mergeDuplicates()`; the automatic path runs in the
 * worker off the indexing stream (`echo-host`'s convergence-key merge). Being a pure function of the
 * candidate set, it is safe to run redundantly — a client pass racing the worker converges, and a
 * second pass over the same entities is a no-op. Groups of one are skipped, so a space with no
 * duplicates costs one grouping pass and no writes.
 *
 * Writes only the fields whose values differ from the merged result, rather than replacing the
 * whole object — a whole-object replace would rewrite every field, so a concurrent edit to a
 * property the merge never touched would lose the last-write-wins race.
 */
export const mergeDuplicates = (entities: readonly Obj.Unknown[]): MergePassResult => {
  const byId = new Map<EntityId, Obj.Unknown>();
  for (const entity of entities) {
    byId.set(entity.id, entity);
  }

  const merged: {
    convergenceKey: string;
    winner: EntityId;
    losers: readonly EntityId[];
  }[] = [];

  // Group on the convergence key alone first. Building a `MergeCandidate` snapshots the entity, which is a
  // deep copy — too costly to pay for every entity on a path that runs per query, when almost none
  // are duplicated.
  const groups = new Map<string, Obj.Unknown[]>();
  for (const entity of entities) {
    const convergenceKey = Obj.getMeta(entity).convergenceKey;
    // The empty string is not a key — grouping on it would merge unrelated entities.
    if (convergenceKey === undefined || convergenceKey.length === 0) {
      continue;
    }
    // Objects only — relations are not merge subjects (their endpoints would not be reconciled).
    // Feed-backed entities have no automerge core to merge into (out of scope, see DESIGN.md);
    // and an entity already merged away is not a candidate — it keeps its convergence key so a late
    // peer can still recognize it, so a query including tombstones would otherwise re-merge it.
    if (!Obj.isObject(entity) || !isEchoObject(entity) || getObjectCore(entity).getMergedInto() !== undefined) {
      continue;
    }
    // A user-deleted entity without a redirect is not a candidate either: deletion is respected,
    // not merged (matching the worker). Treating it as one could crown a deleted entity the
    // winner — tombstoning its live duplicate under it makes every copy invisible at once — or
    // resurrect deleted data into a live winner.
    if (getObjectCore(entity).isDeleted()) {
      continue;
    }
    const group = groups.get(convergenceKey);
    if (group) {
      group.push(entity);
    } else {
      groups.set(convergenceKey, [entity]);
    }
  }

  for (const [convergenceKey, group] of groups) {
    if (group.length < 2) {
      continue;
    }
    const result = mergeCandidates(group.map(toMergeCandidate));
    const winner = byId.get(result.winner);
    if (!winner) {
      continue;
    }

    Obj.update(winner, (winner) => {
      for (const [field, value] of Object.entries(result.data)) {
        // Structural comparison, not reference: `value` is a snapshot copy, so a reference check
        // would always differ for container values and rewrite the winner's own nested fields —
        // a whole-subtree put that a concurrent nested edit would lose to.
        if (!_jsonEqual((winner as Record<string, unknown>)[field], value)) {
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

    // Transitively closed: a loser that already absorbed others hands those on, so the surviving
    // entity names every entity that folded into it rather than only the direct hop.
    const absorbed = new Set<EntityId>();
    for (const loserId of result.losers) {
      const loser = byId.get(loserId);
      if (!loser) {
        continue;
      }
      const core = getObjectCore(loser);
      absorbed.add(loserId);
      for (const inherited of core.getMergedFrom()) {
        absorbed.add(inherited);
      }
      // Record the heads before tombstoning, so a straggler's later edits can be folded in.
      core.setMergedInto(result.winner, core.getHeads());
      core.setDeleted(true);
    }
    getObjectCore(winner).addMergedFrom([...absorbed]);

    merged.push({ convergenceKey, winner: result.winner, losers: result.losers });
  }

  return { merged };
};

/**
 * Repoint references held by `referrers` from any merged-away entity to the entity that survives.
 *
 * Rewriting `X -> loser` to `X -> winner` is idempotent and computes the same target on every
 * peer, so concurrent rewriters converge. This is an optimization, not a correctness requirement:
 * a reference that is never rewritten still resolves through the redirect. It matters most for
 * clients too old to follow `mergedInto`, to which a merged loser looks simply deleted.
 *
 * @returns The number of references rewritten.
 */
export const rewriteReferences = (referrers: readonly Obj.Unknown[], entities: readonly Obj.Unknown[]): number => {
  const byId = new Map<EntityId, Obj.Unknown>();
  for (const entity of entities) {
    byId.set(entity.id, entity);
  }

  let rewritten = 0;

  // Returns a replacement for `value`, or `undefined` when nothing inside it points at a loser.
  // Containers are rebuilt only when a contained ref changed — refs sit inside arrays (a
  // collection's members) and nested records, which a top-level-only sweep would miss — and an
  // untouched field is never written, so it cannot lose a last-write-wins race it was not part of.
  const rewriteValue = (value: unknown): unknown => {
    if (Ref.isRef(value)) {
      const uri = EID.tryParse(value.uri);
      // Type references are `dxn:` rather than `echo:` and are never merge subjects here.
      if (!uri) {
        return undefined;
      }
      const current = EID.getEntityId(uri);
      if (!current) {
        return undefined;
      }
      const resolved = resolveMerged(current, entities);
      const target = resolved === current ? undefined : byId.get(resolved);
      if (!target) {
        return undefined;
      }
      rewritten++;
      return Ref.make(target);
    }
    if (Array.isArray(value)) {
      const replacements = value.map(rewriteValue);
      return replacements.some((replacement) => replacement !== undefined)
        ? value.map((element, index) => replacements[index] ?? element)
        : undefined;
    }
    if (value !== null && typeof value === 'object') {
      const entries = Object.entries(value);
      const replacements = entries.map(([, nested]) => rewriteValue(nested));
      return replacements.some((replacement) => replacement !== undefined)
        ? Object.fromEntries(entries.map(([key, nested], index) => [key, replacements[index] ?? nested]))
        : undefined;
    }
    return undefined;
  };

  for (const referrer of referrers) {
    // Never write to a merged-away referrer: its outbound refs resolve through the redirect
    // anyway, and a write would land after its fold watermark — the worker would then carry the
    // mechanical rewrite into the winner as if it were a straggler's edit, clobbering the value
    // the field-wise merge chose there.
    if (!isEchoObject(referrer) || getObjectCore(referrer).getMergedInto() !== undefined) {
      continue;
    }
    Obj.update(referrer, (referrer) => {
      for (const [field, value] of Object.entries(referrer as Record<string, unknown>)) {
        const replacement = rewriteValue(value);
        if (replacement !== undefined) {
          (referrer as Record<string, unknown>)[field] = replacement;
        }
      }
    });
  }
  return rewritten;
};

/**
 * Structural equality good enough for a write-only-if-different guard: a false negative costs one
 * redundant (idempotent) write, never a wrong value.
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

/**
 * Ids of the entities that were merged into this one, deduplicated and sorted.
 *
 * Empty for an entity that never absorbed a duplicate. The losers are tombstoned rather than
 * erased, so each id here still resolves — which is what makes this usable for a diagnostic that
 * wants to show what was folded in, or for reaching an absorbed entity to recover from it.
 */
export const getMergedFrom = (entity: Obj.Unknown): EntityId[] => getObjectCore(entity).getMergedFrom();

/**
 * True once the entity has been merged into another.
 *
 * Distinct from being deleted: a merged-away entity carries a redirect and stays that way (the
 * worker re-tombstones a restored loser), whereas a plainly deleted entity can be restored.
 * Diagnostics use this to tell the two tombstone kinds apart.
 */
export const isMergedAway = (entity: Obj.Unknown): boolean =>
  isEchoObject(entity) && getObjectCore(entity).getMergedInto() !== undefined;

/**
 * Fold edits made to a merged-away entity *after* it was merged into the entity that survives.
 *
 * A peer that was offline during the merge keeps editing its own copy; those edits arrive later
 * and would otherwise be stranded on a tombstone. Re-running the field-wise merge would not
 * rescue them — it prefers the smallest-id candidate, which is the winner, so the late value
 * would lose. Instead this diffs the loser against the heads recorded at merge time and carries
 * across exactly the fields that changed since, then re-records the heads so the same edit is
 * never folded twice.
 *
 * The worker performs the same fold automatically when a late edit re-indexes a tombstoned
 * loser (`echo-host`'s convergence-key merge); this client-side pass is the manual counterpart.
 *
 * @returns The number of fields folded.
 */
export const foldLateEdits = (entities: readonly Obj.Unknown[]): number => {
  const byId = new Map<EntityId, Obj.Unknown>();
  for (const entity of entities) {
    byId.set(entity.id, entity);
  }

  let folded = 0;
  for (const entity of entities) {
    const core = getObjectCore(entity);
    const mergedInto = core.getMergedInto();
    const mergedAtHeads = core.getMergedAtHeads();
    if (!mergedInto || !mergedAtHeads) {
      continue;
    }

    const winner = byId.get(resolveMerged(entity.id, entities));
    // A deleted winner is left alone (matching the worker): the edits stay above the watermark
    // and fold once it is restored.
    if (!winner || winner.id === entity.id || !isEchoObject(winner) || getObjectCore(winner).isDeleted()) {
      continue;
    }

    const late = core.getChangedDataFieldsSince(mergedAtHeads).filter((field) => field !== PROPERTY_ID);
    if (late.length === 0) {
      continue;
    }

    Obj.update(winner, (winner) => {
      for (const field of late) {
        (winner as Record<string, unknown>)[field] = Obj.getValue(entity, [field]);
        folded++;
      }
    });

    // Advance the watermark, so a later pass does not re-apply what was just folded.
    core.setMergedInto(mergedInto, core.getHeads());
  }

  return folded;
};

/**
 * Follow `system.mergedInto` from `start` to the entity that finally survives, resolving each hop
 * against `entities`.
 *
 * A merged-away entity keeps replicating rather than being erased, precisely so this works: a
 * reference that was never rewritten still reaches the winner.
 */
export const resolveMerged = (start: EntityId, entities: readonly Obj.Unknown[]): EntityId => {
  const byId = new Map<EntityId, Obj.Unknown>();
  for (const entity of entities) {
    byId.set(entity.id, entity);
  }

  return resolveMergeRedirect(start, (id) => {
    const entity = byId.get(id);
    return entity ? getObjectCore(entity).getMergedInto() : undefined;
  });
};
