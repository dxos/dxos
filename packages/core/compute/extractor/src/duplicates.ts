//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Database, Obj, type Type } from '@dxos/echo';

import { type IdentitySpec, identityKeys } from './IdentitySpec';

/**
 * A set of objects the engine believes are the same entity — the "duplicate tuple". Membership is
 * the transitive closure over shared identity keys, so `A~B` by email and `B~C` by foreign key put
 * all three in one group.
 */
export interface DuplicateGroup<S extends Type.AnyObj = Type.AnyObj> {
  /** The identity keys shared by at least two members; what the UI shows as the reason. */
  readonly keys: readonly string[];
  /** Members in `EntityId` order — `objects[0]` is the survivor {@link planMerge} would pick. */
  readonly objects: readonly Type.InstanceType<S>[];
}

/**
 * Groups objects that share at least one identity key. Pure: takes the candidates rather than
 * querying, so it is trivially testable and reusable over a filtered subset.
 *
 * Singletons are dropped — only groups of two or more are returned, ordered largest first so the
 * review UI shows the worst offenders before the marginal ones.
 */
export const findDuplicates = <S extends Type.AnyObj>(
  spec: IdentitySpec<S>,
  candidates: ReadonlyArray<Type.InstanceType<S>>,
): DuplicateGroup<S>[] => {
  // Tombstones keep replicating and a query still returns them until the index is flushed, so a
  // just-merged loser would otherwise resurface as its own duplicate.
  const objects = candidates.filter((object) => !Obj.isDeleted(object));

  // Union-find over object indices, joined through the identity keys they carry.
  const parent = objects.map((_, index) => index);
  const find = (index: number): number => {
    let root = index;
    while (parent[root] !== root) {
      root = parent[root];
    }
    // Path compression keeps repeated lookups flat over a large space.
    let cursor = index;
    while (parent[cursor] !== root) {
      const next = parent[cursor];
      parent[cursor] = root;
      cursor = next;
    }
    return root;
  };
  const union = (left: number, right: number) => {
    const [leftRoot, rightRoot] = [find(left), find(right)];
    if (leftRoot !== rightRoot) {
      parent[Math.max(leftRoot, rightRoot)] = Math.min(leftRoot, rightRoot);
    }
  };

  const keysByIndex = objects.map((object) => identityKeys(spec, object));
  const seenAt = new Map<string, number>();
  const sharedKeys = new Set<string>();
  keysByIndex.forEach((keys, index) => {
    for (const key of keys) {
      const previous = seenAt.get(key);
      if (previous === undefined) {
        seenAt.set(key, index);
      } else {
        sharedKeys.add(key);
        union(previous, index);
      }
    }
  });

  const members = new Map<number, number[]>();
  objects.forEach((_, index) => {
    const root = find(index);
    const existing = members.get(root);
    if (existing) {
      existing.push(index);
    } else {
      members.set(root, [index]);
    }
  });

  const groups: DuplicateGroup<S>[] = [];
  for (const indices of members.values()) {
    if (indices.length < 2) {
      continue;
    }
    const group = indices.map((index) => objects[index]).sort(compareById);
    groups.push({
      keys: [...new Set(indices.flatMap((index) => keysByIndex[index].filter((key) => sharedKeys.has(key))))].sort(),
      objects: group,
    });
  }

  // Largest groups first; ties broken by id so the order is stable across runs.
  return groups.sort((a, b) => b.objects.length - a.objects.length || compareById(a.objects[0], b.objects[0]));
};

/**
 * The outcome of merging a group, computed without writing anything. `preview` is a detached
 * object carrying the merged fields — the Form the user confirms binds to it, so a cancelled
 * merge leaves the database untouched.
 */
export interface MergePlan<S extends Type.AnyObj = Type.AnyObj> {
  readonly survivor: Type.InstanceType<S>;
  readonly losers: readonly Type.InstanceType<S>[];
  readonly preview: Type.InstanceType<S>;
}

/**
 * Picks the survivor and folds every member into a detached preview object. The survivor is the
 * lowest `EntityId` — deterministic, and the same rule `.agents/projects/object-merging/` uses, so
 * the two never disagree about which object is canonical.
 *
 * Field precedence follows the fold order (survivor first, then losers by id), which is why the
 * spec's `merge` must treat `target` as authoritative and only fill gaps / union collections.
 */
export const planMerge = <S extends Type.AnyObj>(spec: IdentitySpec<S>, group: DuplicateGroup<S>): MergePlan<S> => {
  const ordered = [...group.objects].sort(compareById);
  const [survivor, ...losers] = ordered;
  const preview = spec.makeEmpty();
  Obj.update(preview, (preview) => {
    for (const object of ordered) {
      spec.merge(preview, object);
    }
  });

  return { survivor, losers, preview };
};

/**
 * Applies a plan: folds the losers into the survivor, transfers their foreign keys so every
 * external lookup now lands on the survivor, and removes them.
 *
 * `overrides` is the user-edited preview — when supplied it is folded in last, so edits made in
 * the confirmation Form win over the computed merge.
 *
 * LIMITATION: references to a loser are not rewritten. `Message.sender.contact` lives in immutable
 * feed items and cannot be rewritten at all; those refs dangle until the next sync re-resolves the
 * sender's email to the survivor.
 */
export const applyMerge = <S extends Type.AnyObj>(
  db: Database.Database,
  spec: IdentitySpec<S>,
  { survivor, losers, preview }: MergePlan<S>,
  overrides?: Type.InstanceType<S>,
): Effect.Effect<Type.InstanceType<S>> =>
  Effect.gen(function* () {
    Obj.update(survivor, (survivor) => {
      for (const loser of losers) {
        spec.merge(survivor, loser);
        transferKeys(survivor, loser);
      }
      // Fold the confirmed preview last so edits made in the confirmation Form win.
      spec.merge(survivor, overrides ?? preview);
    });

    for (const loser of losers) {
      db.remove(loser);
    }

    return survivor;
  });

/** Ascending `EntityId` order — ULIDs are lexicographically sortable, so this is creation order. */
const compareById = (a: { id: string }, b: { id: string }): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Copies a loser's foreign keys onto the survivor so external ids keep resolving after removal. */
const transferKeys = (target: Obj.Mutable<Obj.Unknown>, loser: Obj.Unknown): void => {
  const meta = Obj.getMeta(target);
  const existing = new Set(meta.keys.map(({ source, id }) => `${source}:${id}`));
  for (const key of Obj.getMeta(loser).keys) {
    if (!existing.has(`${key.source}:${key.id}`)) {
      meta.keys.push({ ...key });
      existing.add(`${key.source}:${key.id}`);
    }
  }
};
