//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as GraphNode from '@dxos/graph/GraphNode';

import { retainedWorkspaces } from './workspace-retention.ts';

const SPACE_A = 'BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const SPACE_B = 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
const SPACE_C = 'BCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC';
const [a, b, c] = [SPACE_A, SPACE_B, SPACE_C].map((id) => GraphPath.getSpacePath(id));

describe('retainedWorkspaces', () => {
  test('keeps the active and previous workspaces whole', ({ expect }) => {
    expect(retainedWorkspaces({ activeDeck: c, previousDeck: a, retainedPlanks: [] })).to.deep.eq([
      { id: c },
      { id: a },
    ]);
  });

  test('keeps the workspace of every plank on screen, once', ({ expect }) => {
    const planks = [GraphPath.getSpacePath(SPACE_B, 'collections', 'x'), GraphPath.getSpacePath(SPACE_C, 'y')];
    expect(retainedWorkspaces({ activeDeck: c, previousDeck: c, retainedPlanks: planks })).to.deep.eq([
      { id: c },
      { id: b },
    ]);
  });

  test('never names the graph root', ({ expect }) => {
    expect(
      retainedWorkspaces({ activeDeck: a, previousDeck: GraphNode.RootId, retainedPlanks: [GraphNode.RootId] }),
    ).to.deep.eq([{ id: a }]);
  });
});
