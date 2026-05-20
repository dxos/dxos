//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ForceProjector } from './force-projector';

describe('ForceProjector', () => {
  test('produces layout nodes for each graph node with positions', ({ expect }) => {
    const p = new ForceProjector();
    p.updateData({
      nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      edges: [
        { id: 'e1', source: 'a', target: 'b' },
        { id: 'e2', source: 'b', target: 'c' },
      ],
    });
    expect(p.layout.nodes).toHaveLength(3);
    expect(p.layout.edges).toHaveLength(2);
    for (const n of p.layout.nodes) {
      expect(typeof n.x).toBe('number');
      expect(typeof n.y).toBe('number');
    }
  });

  test('tick moves the simulation', ({ expect }) => {
    const p = new ForceProjector();
    p.updateData({
      nodes: [{ id: 'a' }, { id: 'b' }],
      edges: [{ id: 'e', source: 'a', target: 'b' }],
    });
    const before = p.layout.nodes.map((n) => ({ x: n.x, y: n.y }));
    for (let i = 0; i < 30; i++) {
      p.tick(16);
    }
    const after = p.layout.nodes.map((n) => ({ x: n.x, y: n.y }));
    const moved = before.some((b, i) => b.x !== after[i].x || b.y !== after[i].y);
    expect(moved).toBe(true);
  });

  test('findNode returns nearest node within radius', ({ expect }) => {
    const p = new ForceProjector();
    p.updateData({ nodes: [{ id: 'a' }], edges: [] });
    p.layout.nodes[0].x = 10;
    p.layout.nodes[0].y = 20;
    expect(p.findNode(10, 20, 5)?.id).toBe('a');
    expect(p.findNode(100, 100, 5)).toBeUndefined();
  });
});
