//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { GraphModel, type GraphNode } from '@dxos/graph';

import { type ComputeNode } from '../schema';

describe('graph builder', () => {
  test('graph', ({ expect }) => {
    const graph = new GraphModel<GraphNode<ComputeNode>>();
  });
});
