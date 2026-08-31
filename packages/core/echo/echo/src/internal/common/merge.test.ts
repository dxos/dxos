//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type EntityId } from '@dxos/keys';

import { resolveMergeRedirect } from './merge';

// Ids are compared lexicographically, so fixed ULID-shaped literals keep the ordering readable:
// `idA < idB < idC`.
const idA = '01AAAAAAAAAAAAAAAAAAAAAAAA' as EntityId;
const idB = '01BBBBBBBBBBBBBBBBBBBBBBBB' as EntityId;
const idC = '01CCCCCCCCCCCCCCCCCCCCCCCC' as EntityId;

describe('resolveMergeRedirect', () => {
  const chain = (edges: Record<string, EntityId>) => (id: EntityId) => edges[id];

  test('an entity that was not merged away resolves to itself', ({ expect }) => {
    expect(resolveMergeRedirect(idB, chain({}))).toBe(idB);
  });

  test('follows a single hop', ({ expect }) => {
    expect(resolveMergeRedirect(idB, chain({ [idB]: idA }))).toBe(idA);
  });

  test('follows a chain transitively to the global minimum', ({ expect }) => {
    // The partial-view case: one peer wrote C -> B, another later wrote B -> A.
    expect(resolveMergeRedirect(idC, chain({ [idC]: idB, [idB]: idA }))).toBe(idA);
  });

  test('terminates on a cycle instead of looping', ({ expect }) => {
    expect(resolveMergeRedirect(idA, chain({ [idA]: idB, [idB]: idA }))).toBe(idA);
  });

  test('terminates on a self-reference', ({ expect }) => {
    expect(resolveMergeRedirect(idA, chain({ [idA]: idA }))).toBe(idA);
  });

  test('stops at a forward reference rather than following it', ({ expect }) => {
    // Every legitimate edge decreases the id; an increasing edge is corrupt data, not a hop.
    expect(resolveMergeRedirect(idA, chain({ [idA]: idC }))).toBe(idA);
  });
});
