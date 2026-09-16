//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as GraphNode from '@dxos/graph/GraphNode';

import { DeckSchema } from '#types';

import { evictableWorkspaces, sameWorkspaces } from './workspace-retention.ts';

const SPACE_A = 'BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const SPACE_B = 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
const SPACE_C = 'BCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC';
const SPACE_D = 'BDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD';
const [a, b, c, d] = [SPACE_A, SPACE_B, SPACE_C, SPACE_D].map((id) => GraphPath.getSpacePath(id));

describe('evictableWorkspaces', () => {
  test('names every space workspace except the active and previous ones', ({ expect }) => {
    expect(
      evictableWorkspaces({ rootChildren: [a, b, c, d], activeDeck: c, previousDeck: a, retainedPlanks: [] }),
    ).to.deep.eq([b, d]);
  });

  test('keeps a workspace a plank on screen belongs to', ({ expect }) => {
    const plank = GraphPath.getSpacePath(SPACE_B, 'collections', 'x');
    expect(
      evictableWorkspaces({ rootChildren: [a, b, c], activeDeck: c, previousDeck: a, retainedPlanks: [plank] }),
    ).to.deep.eq([]);
  });

  test('never names the graph root, a pinned workspace, a companion, or the unresolved sentinel', ({ expect }) => {
    const rootChildren = [
      GraphNode.RootId,
      `${GraphNode.RootId}/dxos:settings`,
      `${GraphNode.RootId}/~search`,
      `${GraphNode.RootId}/not-found`,
      a,
    ];
    expect(
      evictableWorkspaces({
        rootChildren,
        activeDeck: DeckSchema.DEFAULT_DECK_ID,
        previousDeck: GraphNode.RootId,
        retainedPlanks: [],
      }),
    ).to.deep.eq([a]);
  });
});

describe('sameWorkspaces', () => {
  test('ignores order, so reordering the rail is not a change in the answer', ({ expect }) => {
    expect(sameWorkspaces([a, b], [b, a])).toBe(true);
    expect(sameWorkspaces([a, b], [a, c])).toBe(false);
    expect(sameWorkspaces([a], [a, b])).toBe(false);
  });
});
