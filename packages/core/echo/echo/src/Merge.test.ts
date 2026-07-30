//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type ForeignKey } from '@dxos/echo-protocol';
import { type EntityId } from '@dxos/keys';

import * as Merge from './Merge';
import * as Obj from './Obj';
import { TestSchema } from './testing';

// Ids are compared lexicographically, so fixed ULID-shaped literals keep the ordering readable:
// `idA < idB < idC`.
const idA = '01AAAAAAAAAAAAAAAAAAAAAAAA' as EntityId;
const idB = '01BBBBBBBBBBBBBBBBBBBBBBBB' as EntityId;
const idC = '01CCCCCCCCCCCCCCCCCCCCCCCC' as EntityId;
const idD = '01DDDDDDDDDDDDDDDDDDDDDDDD' as EntityId;

const candidate = (
  id: EntityId,
  data: Record<string, unknown> = {},
  options: { naturalKey?: string; keys?: ForeignKey[] } = {},
): Merge.Candidate => ({ id, naturalKey: options.naturalKey ?? 'org.example.seed', data, keys: options.keys });

// Every permutation of the input, so order-independence is asserted exhaustively rather than sampled.
const permutations = <T>(items: readonly T[]): T[][] => {
  if (items.length <= 1) {
    return [[...items]];
  }
  return items.flatMap((item, index) =>
    permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [item, ...rest]),
  );
};

describe('Merge', () => {
  describe('getNaturalKey / setNaturalKey', () => {
    const task = (title: string) => Obj.make(TestSchema.Task, { title });

    test('an entity declares no natural key by default', ({ expect }) => {
      expect(Merge.getNaturalKey(task('one'))).toBeUndefined();
    });

    test('round-trips a natural key', ({ expect }) => {
      const object = task('one');
      Merge.setNaturalKey(object, 'org.example.seed');
      expect(Merge.getNaturalKey(object)).toBe('org.example.seed');
    });

    test('re-setting replaces rather than accumulates', ({ expect }) => {
      const object = task('one');
      Merge.setNaturalKey(object, 'org.example.seed');
      Merge.setNaturalKey(object, 'org.example.seed@2');
      expect(Merge.getNaturalKey(object)).toBe('org.example.seed@2');
    });

    test('undefined clears the natural key', ({ expect }) => {
      const object = task('one');
      Merge.setNaturalKey(object, 'org.example.seed');
      Merge.setNaturalKey(object, undefined);
      expect(Merge.getNaturalKey(object)).toBeUndefined();
    });

    test('the natural key is independent of the registry key and version', ({ expect }) => {
      const object = task('one');
      Obj.update(object, (object) => {
        Obj.getMeta(object).key = 'org.example.registry.entry';
        Obj.getMeta(object).version = '1.2.0';
      });
      Merge.setNaturalKey(object, 'org.example.seed@2');
      expect(Merge.getNaturalKey(object)).toBe('org.example.seed@2');
      expect(Obj.getMeta(object).key).toBe('org.example.registry.entry');
      expect(Obj.getMeta(object).version).toBe('1.2.0');
    });

    test('survives a snapshot round-trip', ({ expect }) => {
      const object = task('one');
      Merge.setNaturalKey(object, 'org.example.seed');
      expect(Merge.getNaturalKey(Obj.getSnapshot(object))).toBe('org.example.seed');
    });
  });

  describe('candidateOf', () => {
    test('builds a candidate from a live object', ({ expect }) => {
      const object = Obj.make(TestSchema.Task, { title: 'one' });
      Merge.setNaturalKey(object, 'org.example.seed');
      const candidate = Merge.candidateOf(object);
      expect(candidate.id).toBe(object.id);
      expect(candidate.naturalKey).toBe('org.example.seed');
      expect(candidate.data.title).toBe('one');
    });

    test('real objects merge field-wise by id', ({ expect }) => {
      const first = Obj.make(TestSchema.Task, { title: 'first' });
      const second = Obj.make(TestSchema.Task, { title: 'second', description: 'only on second' });
      for (const object of [first, second]) {
        Merge.setNaturalKey(object, 'org.example.seed');
      }
      // Ids are ULIDs minted in creation order, so `first` is the winner.
      const result = Merge.merge([Merge.candidateOf(second), Merge.candidateOf(first)]);
      expect(result.winner).toBe(first.id);
      expect(result.losers).toEqual([second.id]);
      expect(result.data.title).toBe('first');
      expect(result.data.description).toBe('only on second');
    });

    test('objects without a natural key are not grouped as duplicates', ({ expect }) => {
      const first = Obj.make(TestSchema.Task, { title: 'first' });
      const second = Obj.make(TestSchema.Task, { title: 'second' });
      const duplicates = Merge.findDuplicates([Merge.candidateOf(first), Merge.candidateOf(second)]);
      expect(duplicates.size).toBe(0);
    });
  });

  describe('selectWinner', () => {
    test('an empty set has no winner', ({ expect }) => {
      expect(Merge.selectWinner([])).toBeUndefined();
    });

    test('a single candidate wins', ({ expect }) => {
      expect(Merge.selectWinner([candidate(idB)])).toBe(idB);
    });

    test('the minimum id wins', ({ expect }) => {
      expect(Merge.selectWinner([candidate(idC), candidate(idA), candidate(idB)])).toBe(idA);
    });

    test('is stable under permutation', ({ expect }) => {
      const candidates = [candidate(idC), candidate(idA), candidate(idB)];
      for (const permutation of permutations(candidates)) {
        expect(Merge.selectWinner(permutation)).toBe(idA);
      }
    });

    test('a subset never yields a smaller winner than the superset', ({ expect }) => {
      const superset = [candidate(idA), candidate(idB), candidate(idC)];
      const subset = [candidate(idB), candidate(idC)];
      expect(Merge.selectWinner(subset)! >= Merge.selectWinner(superset)!).toBe(true);
    });
  });

  describe('groupByNaturalKey', () => {
    test('partitions by key', ({ expect }) => {
      const groups = Merge.groupByNaturalKey([
        candidate(idA, {}, { naturalKey: 'one' }),
        candidate(idB, {}, { naturalKey: 'two' }),
        candidate(idC, {}, { naturalKey: 'one' }),
      ]);
      expect([...groups.keys()].sort()).toEqual(['one', 'two']);
      expect(groups.get('one')!.map(({ id }) => id)).toEqual([idA, idC]);
    });

    test('entities without a natural key are not candidates', ({ expect }) => {
      const groups = Merge.groupByNaturalKey([{ id: idA, data: {} }, candidate(idB)]);
      expect(groups.size).toBe(1);
      expect(groups.get('org.example.seed')!.map(({ id }) => id)).toEqual([idB]);
    });

    test('keys differing only by encoded generation do not group together', ({ expect }) => {
      const groups = Merge.groupByNaturalKey([
        candidate(idA, {}, { naturalKey: 'org.example.seed' }),
        candidate(idB, {}, { naturalKey: 'org.example.seed@2' }),
      ]);
      expect(groups.size).toBe(2);
    });
  });

  describe('findDuplicates', () => {
    test('drops groups of one', ({ expect }) => {
      const duplicates = Merge.findDuplicates([
        candidate(idA, {}, { naturalKey: 'one' }),
        candidate(idB, {}, { naturalKey: 'two' }),
        candidate(idC, {}, { naturalKey: 'two' }),
      ]);
      expect([...duplicates.keys()]).toEqual(['two']);
    });

    test('no duplicates in a set of distinct keys', ({ expect }) => {
      const duplicates = Merge.findDuplicates([
        candidate(idA, {}, { naturalKey: 'one' }),
        candidate(idB, {}, { naturalKey: 'two' }),
      ]);
      expect(duplicates.size).toBe(0);
    });
  });

  describe('merge', () => {
    test('throws on an empty candidate set', ({ expect }) => {
      expect(() => Merge.merge([])).toThrow(TypeError);
    });

    test('a single candidate merges to itself with no losers', ({ expect }) => {
      const result = Merge.merge([candidate(idB, { title: 'only' })]);
      expect(result.winner).toBe(idB);
      expect(result.losers).toEqual([]);
      expect(result.data).toEqual({ title: 'only' });
    });

    test('the minimum id is the winner and the rest are losers, ascending', ({ expect }) => {
      const result = Merge.merge([candidate(idC), candidate(idA), candidate(idB)]);
      expect(result.winner).toBe(idA);
      expect(result.losers).toEqual([idB, idC]);
    });

    test('a field defined by several candidates takes the smallest-id value', ({ expect }) => {
      const result = Merge.merge([
        candidate(idC, { title: 'from C' }),
        candidate(idA, { title: 'from A' }),
        candidate(idB, { title: 'from B' }),
      ]);
      expect(result.data.title).toBe('from A');
    });

    test('a field only a larger-id candidate defines is still carried over', ({ expect }) => {
      const result = Merge.merge([candidate(idA, { title: 'from A' }), candidate(idB, { subtitle: 'from B' })]);
      expect(result.data).toEqual({ title: 'from A', subtitle: 'from B' });
    });

    test('a property present but undefined does not claim the field', ({ expect }) => {
      const result = Merge.merge([candidate(idA, { title: undefined }), candidate(idB, { title: 'from B' })]);
      expect(result.data.title).toBe('from B');
    });

    test('is permutation-independent', ({ expect }) => {
      const candidates = [
        candidate(idC, { shared: 'C', onlyC: 'c' }),
        candidate(idA, { shared: 'A' }),
        candidate(idB, { shared: 'B', onlyB: 'b' }),
      ];
      const expected = Merge.merge(candidates);
      for (const permutation of permutations(candidates)) {
        expect(Merge.merge(permutation)).toEqual(expected);
      }
    });

    test('is not a pairwise fold — the non-associative case converges', ({ expect }) => {
      // Z < X < Y, and Z does not define `a`. A pairwise fold into Z would yield X's `a` in one
      // order and Y's in the other; merging over the whole set always yields X's.
      const zed = candidate(idA, { base: 'z' });
      const ex = candidate(idB, { base: 'x', a: 'from X' });
      const why = candidate(idC, { base: 'y', a: 'from Y' });
      expect(Merge.merge([zed, ex, why]).data.a).toBe('from X');
      expect(Merge.merge([zed, why, ex]).data.a).toBe('from X');
    });

    test('is idempotent — merging the result back in changes nothing', ({ expect }) => {
      const candidates = [candidate(idA, { title: 'A' }), candidate(idB, { title: 'B', extra: 'b' })];
      const once = Merge.merge(candidates);
      const twice = Merge.merge([{ id: once.winner, naturalKey: 'org.example.seed', data: once.data }, ...candidates]);
      expect(twice.data).toEqual(once.data);
      expect(twice.winner).toBe(once.winner);
    });

    test('unions foreign keys, deduplicated and deterministically ordered', ({ expect }) => {
      const result = Merge.merge([
        candidate(
          idB,
          {},
          {
            keys: [
              { source: 'zed.com', id: '2' },
              { source: 'github.com', id: '1' },
            ],
          },
        ),
        candidate(
          idA,
          {},
          {
            keys: [
              { source: 'github.com', id: '1' },
              { source: 'github.com', id: '0' },
            ],
          },
        ),
      ]);
      expect(result.keys).toEqual([
        { source: 'github.com', id: '0' },
        { source: 'github.com', id: '1' },
        { source: 'zed.com', id: '2' },
      ]);
    });

    test('the foreign-key union is permutation-independent', ({ expect }) => {
      const candidates = [
        candidate(idA, {}, { keys: [{ source: 'b.com', id: '1' }] }),
        candidate(idB, {}, { keys: [{ source: 'a.com', id: '2' }] }),
        candidate(idC, {}, { keys: [{ source: 'a.com', id: '1' }] }),
      ];
      const expected = Merge.merge(candidates).keys;
      for (const permutation of permutations(candidates)) {
        expect(Merge.merge(permutation).keys).toEqual(expected);
      }
    });
  });

  describe('resolveRedirect', () => {
    const chain = (edges: Record<string, EntityId>) => (id: EntityId) => edges[id];

    test('an entity that was not merged away resolves to itself', ({ expect }) => {
      expect(Merge.resolveRedirect(idB, chain({}))).toBe(idB);
    });

    test('follows a single hop', ({ expect }) => {
      expect(Merge.resolveRedirect(idB, chain({ [idB]: idA }))).toBe(idA);
    });

    test('follows a chain transitively to the global minimum', ({ expect }) => {
      // The partial-view case: one peer wrote C -> B, another later wrote B -> A.
      expect(Merge.resolveRedirect(idC, chain({ [idC]: idB, [idB]: idA }))).toBe(idA);
    });

    test('terminates on a cycle instead of looping', ({ expect }) => {
      expect(Merge.resolveRedirect(idA, chain({ [idA]: idB, [idB]: idA }))).toBe(idA);
    });

    test('terminates on a self-reference', ({ expect }) => {
      expect(Merge.resolveRedirect(idA, chain({ [idA]: idA }))).toBe(idA);
    });

    test('stops at a forward reference rather than following it', ({ expect }) => {
      // Every legitimate edge decreases the id; an increasing edge is corrupt data, not a hop.
      expect(Merge.resolveRedirect(idA, chain({ [idA]: idC }))).toBe(idA);
    });

    test('every edge produced by a merge decreases the id, so chains are finite', ({ expect }) => {
      const result = Merge.merge([candidate(idA), candidate(idB), candidate(idC), candidate(idD)]);
      for (const loser of result.losers) {
        expect(loser > result.winner).toBe(true);
      }
    });

    test('partial-view merges converge on the global minimum', ({ expect }) => {
      // Peer 1 sees {B, C} and writes C -> B. Peer 2 also sees A and writes B -> A, C -> A.
      const peer1 = Merge.merge([candidate(idB), candidate(idC)]);
      const peer2 = Merge.merge([candidate(idA), candidate(idB), candidate(idC)]);
      const edges: Record<string, EntityId> = {};
      for (const loser of peer1.losers) {
        edges[loser] = peer1.winner;
      }
      // Last-write-wins on the overlapping edge; peer 2's view is the one that survives here.
      for (const loser of peer2.losers) {
        edges[loser] = peer2.winner;
      }
      for (const start of [idA, idB, idC]) {
        expect(Merge.resolveRedirect(start, chain(edges))).toBe(idA);
      }
    });

    test('converges even when the losing write order is reversed', ({ expect }) => {
      // Same two peers, but peer 1's narrower view lands last: C -> B, and B -> A survives from
      // peer 2, so C still reaches A by one extra hop.
      const edges: Record<string, EntityId> = { [idB]: idA, [idC]: idB };
      for (const start of [idA, idB, idC]) {
        expect(Merge.resolveRedirect(start, chain(edges))).toBe(idA);
      }
    });
  });
});
