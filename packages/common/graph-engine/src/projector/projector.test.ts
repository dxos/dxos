//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Graph } from '@dxos/graph';

import { type LayoutGraph } from '../types';
import { Projector } from './projector';

class TestProjector extends Projector {
  layout: LayoutGraph = { nodes: [], edges: [] };
  ticks = 0;
  override onUpdate(graph: Graph.Any) {
    this.layout = {
      nodes: graph.nodes.map((n) => ({ id: n.id, x: 0, y: 0 })),
      edges: [],
    };
  }
  override onTick(): boolean {
    this.ticks++;
    return false;
  }
  override findNode() {
    return undefined;
  }
}

describe('Projector', () => {
  test('updateData calls onUpdate and emits', ({ expect }) => {
    const p = new TestProjector();
    let fired = 0;
    p.updated.on(() => fired++);
    p.updateData({ nodes: [{ id: 'a' }], edges: [] });
    expect(fired).toBe(1);
    expect(p.layout.nodes).toHaveLength(1);
  });

  test('tick delegates to onTick', ({ expect }) => {
    const p = new TestProjector();
    p.tick(16);
    p.tick(33);
    expect(p.ticks).toBe(2);
  });
});
