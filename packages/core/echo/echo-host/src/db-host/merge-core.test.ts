//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type ForeignKey } from '@dxos/echo-protocol';
import { resolveMergeRedirect } from '@dxos/echo/internal';
import { type EntityId } from '@dxos/keys';

import { type MergeCandidate, mergeCandidates } from './merge-core';

// Ids are compared lexicographically, so fixed ULID-shaped literals keep the ordering readable:
// `idA < idB < idC`.
const idA = '01AAAAAAAAAAAAAAAAAAAAAAAA' as EntityId;
const idB = '01BBBBBBBBBBBBBBBBBBBBBBBB' as EntityId;
const idC = '01CCCCCCCCCCCCCCCCCCCCCCCC' as EntityId;
const idD = '01DDDDDDDDDDDDDDDDDDDDDDDD' as EntityId;

const candidate = (
  id: EntityId,
  data: Record<string, unknown> = {},
  options: { convergenceKey?: string; keys?: ForeignKey[] } = {},
): MergeCandidate => ({ id, convergenceKey: options.convergenceKey ?? 'org.example.seed', data, keys: options.keys });

// Every permutation of the input, so order-independence is asserted exhaustively rather than sampled.
const permutations = <T>(items: readonly T[]): T[][] => {
  if (items.length <= 1) {
    return [[...items]];
  }
  return items.flatMap((item, index) =>
    permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [item, ...rest]),
  );
};

describe('merge core', () => {
  describe('mergeCandidates', () => {
    test('throws on an empty candidate set', ({ expect }) => {
      expect(() => mergeCandidates([])).toThrow(TypeError);
    });

    test('the same entity passed twice is not a duplicate of itself', ({ expect }) => {
      // Query results are not unique until presentation, so a caller can hand the same entity in
      // more than once. Treating the repeat as a loser would tombstone the winner.
      const result = mergeCandidates([candidate(idB, { title: 'only' }), candidate(idB, { title: 'only' })]);
      expect(result.winner).toBe(idB);
      expect(result.losers).toEqual([]);
    });

    test('a repeat alongside a genuine duplicate still yields one loser', ({ expect }) => {
      const result = mergeCandidates([candidate(idB), candidate(idA), candidate(idB)]);
      expect(result.winner).toBe(idA);
      expect(result.losers).toEqual([idB]);
    });

    test('a single candidate merges to itself with no losers', ({ expect }) => {
      const result = mergeCandidates([candidate(idB, { title: 'only' })]);
      expect(result.winner).toBe(idB);
      expect(result.losers).toEqual([]);
      expect(result.data).toEqual({ title: 'only' });
    });

    test('the minimum id is the winner and the rest are losers, ascending', ({ expect }) => {
      const result = mergeCandidates([candidate(idC), candidate(idA), candidate(idB)]);
      expect(result.winner).toBe(idA);
      expect(result.losers).toEqual([idB, idC]);
    });

    test('the winner is stable under permutation', ({ expect }) => {
      const candidates = [candidate(idC), candidate(idA), candidate(idB)];
      for (const permutation of permutations(candidates)) {
        expect(mergeCandidates(permutation).winner).toBe(idA);
      }
    });

    test('a subset never yields a smaller winner than the superset', ({ expect }) => {
      // The monotonicity that makes redirect chains terminate: partial views can only pick
      // larger winners, so every redirect edge points at a smaller id.
      const superset = [candidate(idA), candidate(idB), candidate(idC)];
      const subset = [candidate(idB), candidate(idC)];
      expect(mergeCandidates(subset).winner >= mergeCandidates(superset).winner).toBe(true);
    });

    test('a field defined by several candidates takes the smallest-id value', ({ expect }) => {
      const result = mergeCandidates([
        candidate(idC, { title: 'from C' }),
        candidate(idA, { title: 'from A' }),
        candidate(idB, { title: 'from B' }),
      ]);
      expect(result.data.title).toBe('from A');
    });

    test('a field only a larger-id candidate defines is still carried over', ({ expect }) => {
      const result = mergeCandidates([candidate(idA, { title: 'from A' }), candidate(idB, { subtitle: 'from B' })]);
      expect(result.data).toEqual({ title: 'from A', subtitle: 'from B' });
    });

    test('a property present but undefined does not claim the field', ({ expect }) => {
      const result = mergeCandidates([candidate(idA, { title: undefined }), candidate(idB, { title: 'from B' })]);
      expect(result.data.title).toBe('from B');
    });

    test('is permutation-independent', ({ expect }) => {
      const candidates = [
        candidate(idC, { shared: 'C', onlyC: 'c' }),
        candidate(idA, { shared: 'A' }),
        candidate(idB, { shared: 'B', onlyB: 'b' }),
      ];
      const expected = mergeCandidates(candidates);
      for (const permutation of permutations(candidates)) {
        expect(mergeCandidates(permutation)).toEqual(expected);
      }
    });

    test('is not a pairwise fold — the non-associative case converges', ({ expect }) => {
      // Z < X < Y, and Z does not define `a`. A pairwise fold into Z would yield X's `a` in one
      // order and Y's in the other; merging over the whole set always yields X's.
      const zed = candidate(idA, { base: 'z' });
      const ex = candidate(idB, { base: 'x', a: 'from X' });
      const why = candidate(idC, { base: 'y', a: 'from Y' });
      expect(mergeCandidates([zed, ex, why]).data.a).toBe('from X');
      expect(mergeCandidates([zed, why, ex]).data.a).toBe('from X');
    });

    test('is idempotent — merging the result back in changes nothing', ({ expect }) => {
      const candidates = [candidate(idA, { title: 'A' }), candidate(idB, { title: 'B', extra: 'b' })];
      const once = mergeCandidates(candidates);
      const twice = mergeCandidates([
        { id: once.winner, convergenceKey: 'org.example.seed', data: once.data },
        ...candidates,
      ]);
      expect(twice.data).toEqual(once.data);
      expect(twice.winner).toBe(once.winner);
    });

    test('field names colliding with Object.prototype members merge like any other field', ({ expect }) => {
      // A plain-object accumulator checked with `in` would see these as already present and drop
      // them from every candidate; `__proto__` would silently mutate the prototype instead.
      const result = mergeCandidates([
        candidate(idA, { title: 'from A' }),
        candidate(idB, {
          toString: 'B toString',
          constructor: 'B ctor',
          valueOf: 'B valueOf',
          hasOwnProperty: 'B own',
        }),
      ]);
      expect(result.data).toEqual({
        title: 'from A',
        toString: 'B toString',
        constructor: 'B ctor',
        valueOf: 'B valueOf',
        hasOwnProperty: 'B own',
      });
      expect(result.data.toString).toBe('B toString');
    });

    test('an own __proto__ field is stored as data, not as the prototype', ({ expect }) => {
      // JSON.parse produces own `__proto__` properties, so imported data can carry one.
      const evil = JSON.parse('{"__proto__": {"polluted": true}, "title": "from B"}');
      const result = mergeCandidates([candidate(idA, {}), candidate(idB, evil)]);
      expect(Object.getPrototypeOf(result.data)).toBe(Object.prototype);
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
      expect(Object.getOwnPropertyDescriptor(result.data, '__proto__')?.value).toEqual({ polluted: true });
      expect(result.data.title).toBe('from B');
    });

    test('unions foreign keys, deduplicated and deterministically ordered', ({ expect }) => {
      const result = mergeCandidates([
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
      const expected = mergeCandidates(candidates).keys;
      for (const permutation of permutations(candidates)) {
        expect(mergeCandidates(permutation).keys).toEqual(expected);
      }
    });
  });

  // The interplay between the merge function and the resolver it hands chains to — the resolver's
  // own unit tests live beside it in `@dxos/echo`.
  describe('mergeCandidates + resolveMergeRedirect', () => {
    const chain = (edges: Record<string, EntityId>) => (id: EntityId) => edges[id];

    test('every edge produced by a merge decreases the id, so chains are finite', ({ expect }) => {
      const result = mergeCandidates([candidate(idA), candidate(idB), candidate(idC), candidate(idD)]);
      for (const loser of result.losers) {
        expect(loser > result.winner).toBe(true);
      }
    });

    test('partial-view merges converge on the global minimum', ({ expect }) => {
      // Peer 1 sees {B, C} and writes C -> B. Peer 2 also sees A and writes B -> A, C -> A.
      const peer1 = mergeCandidates([candidate(idB), candidate(idC)]);
      const peer2 = mergeCandidates([candidate(idA), candidate(idB), candidate(idC)]);
      const edges: Record<string, EntityId> = {};
      for (const loser of peer1.losers) {
        edges[loser] = peer1.winner;
      }
      // Last-write-wins on the overlapping edge; peer 2's view is the one that survives here.
      for (const loser of peer2.losers) {
        edges[loser] = peer2.winner;
      }
      for (const start of [idA, idB, idC]) {
        expect(resolveMergeRedirect(start, chain(edges))).toBe(idA);
      }
    });

    test('converges even when the losing write order is reversed', ({ expect }) => {
      // Same two peers, but peer 1's narrower view lands last: C -> B, and B -> A survives from
      // peer 2, so C still reaches A by one extra hop.
      const edges: Record<string, EntityId> = { [idB]: idA, [idC]: idB };
      for (const start of [idA, idB, idC]) {
        expect(resolveMergeRedirect(start, chain(edges))).toBe(idA);
      }
    });
  });
});
