//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { type ClassNode, type EllipseNode, type Scene, isClassNode, isEllipseNode } from '../types.ts';
import { type ConstrainedModel, createConstrainedProjection, rewriteForDrop, solve } from './constrained.ts';

const model: ConstrainedModel = {
  nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }],
  constraints: [
    { subject: 'B', relation: 'east', object: 'A' },
    { subject: 'B', relation: 'aligned', object: 'A' },
    { subject: 'C', relation: 'south', object: 'A' },
    { subject: 'D', relation: 'south', object: 'B' },
    { subject: 'D', relation: 'east', object: 'C' },
  ],
};

const centerOf = (scene: Scene, id: string) => {
  const node = scene.nodes[id];
  if (!node) {
    throw new Error(`no node ${id}`);
  }
  return node.center;
};

describe('constrained projection', () => {
  test('solve honours east/west, north/south and aligned', ({ expect }) => {
    const scene = solve(model);
    const a = centerOf(scene, 'A');
    const b = centerOf(scene, 'B');
    const c = centerOf(scene, 'C');
    const d = centerOf(scene, 'D');
    expect(b.x).toBeGreaterThan(a.x);
    expect(b.y).toBe(a.y);
    expect(c.y).toBeGreaterThan(a.y);
    expect(d.y).toBeGreaterThan(b.y);
    expect(d.x).toBeGreaterThan(c.x);
  });

  test('nodes sharing a row without an ordering never overlap', ({ expect }) => {
    const scene = solve({
      nodes: [{ id: 'X' }, { id: 'Y' }, { id: 'Z' }],
      constraints: [
        { subject: 'Y', relation: 'aligned', object: 'X' },
        { subject: 'Z', relation: 'aligned', object: 'X' },
      ],
    });
    const xs = ['X', 'Y', 'Z'].map((id) => centerOf(scene, id).x);
    expect(new Set(xs).size).toBe(3);
  });

  test('a mostly horizontal drop rewrites to east/west + aligned with the nearest node', ({ expect }) => {
    const scene = solve(model);
    const a = centerOf(scene, 'A');
    const c = centerOf(scene, 'C');
    // Drop C to the left of A, on A's row.
    const next = rewriteForDrop(model, scene, 'C', { x: a.x - 200 - c.x, y: a.y - c.y });
    const mine = next.constraints.filter(({ subject }) => subject === 'C');
    expect(mine).toEqual([
      { subject: 'C', relation: 'west', object: 'A' },
      { subject: 'C', relation: 'aligned', object: 'A' },
    ]);
    const resolved = solve(next);
    expect(centerOf(resolved, 'C').x).toBeLessThan(centerOf(resolved, 'A').x);
    expect(centerOf(resolved, 'C').y).toBe(centerOf(resolved, 'A').y);
  });

  test('a mostly vertical drop rewrites to north/south', ({ expect }) => {
    const scene = solve(model);
    const b = centerOf(scene, 'B');
    const d = centerOf(scene, 'D');
    const next = rewriteForDrop(model, scene, 'D', { x: b.x - d.x, y: b.y - 150 - d.y });
    expect(next.constraints.filter(({ subject }) => subject === 'D')).toEqual([
      { subject: 'D', relation: 'north', object: 'B' },
    ]);
  });

  test('a drop with no neighbour is rejected', ({ expect }) => {
    const alone: ConstrainedModel = { nodes: [{ id: 'A' }], constraints: [] };
    expect(rewriteForDrop(alone, solve(alone), 'A', { x: 100, y: 0 })).toBe(alone);
  });

  test('the projection re-solves after a move and drops constraints on delete', ({ expect }) => {
    const registry = Registry.make();
    const atom = Atom.keepAlive(Atom.make<ConstrainedModel>(model));
    const projection = createConstrainedProjection({ registry, model: atom });
    const before = registry.get(projection.scene);
    const a = centerOf(before, 'A');
    const c = centerOf(before, 'C');
    projection.apply({ kind: 'move', ids: ['C'], delta: { x: a.x + 300 - c.x, y: a.y - c.y } });
    const after = registry.get(projection.scene);
    expect(centerOf(after, 'C').x).toBeGreaterThan(centerOf(after, 'A').x);
    expect(centerOf(after, 'C').y).toBe(centerOf(after, 'A').y);

    projection.apply({ kind: 'delete', ids: ['A'] });
    const model2 = registry.get(atom);
    expect(model2.nodes.map(({ id }) => id)).toEqual(['B', 'C', 'D']);
    expect(model2.constraints.some(({ subject, object }) => subject === 'A' || object === 'A')).toBe(false);
  });

  test('created nodes keep their type and label field', ({ expect }) => {
    const registry = Registry.make();
    const atom = Atom.keepAlive(Atom.make<ConstrainedModel>({ nodes: [{ id: 'A' }], constraints: [] }));
    const projection = createConstrainedProjection({ registry, model: atom });
    const ellipse: EllipseNode = {
      type: 'ellipse',
      id: 'E',
      z: 'z',
      center: { x: 400, y: 0 },
      size: { width: 128, height: 64 },
      label: 'Round',
    };
    const klass: ClassNode = {
      type: 'class',
      id: 'K',
      z: 'z',
      center: { x: 0, y: 400 },
      size: { width: 1, height: 1 },
      name: 'Klass',
      attributes: [],
      methods: [],
    };
    projection.apply({ kind: 'create', node: ellipse });
    projection.apply({ kind: 'create', node: klass });
    const scene = registry.get(projection.scene);
    expect(scene.nodes.E.type).toBe('ellipse');
    expect(isEllipseNode(scene.nodes.E) && scene.nodes.E.label).toBe('Round');
    expect(isClassNode(scene.nodes.K) && scene.nodes.K.name).toBe('Klass');
    projection.apply({ kind: 'update', id: 'K', values: { name: 'Renamed' } });
    const after = registry.get(projection.scene).nodes.K;
    expect(isClassNode(after) && after.name).toBe('Renamed');
  });
});
