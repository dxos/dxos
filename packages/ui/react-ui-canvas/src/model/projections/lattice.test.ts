//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { DEFAULT_LATTICE } from '../../utils/lattice.ts';
import { createNode, nodeBounds } from '../../utils/shapes.ts';
import { createMemoryStore } from '../store.ts';
import { type Node, type Scene } from '../types.ts';
import { constrainIntent, createLatticeProjection } from './lattice.ts';

const spec = DEFAULT_LATTICE;

/** A one-cell shape at lattice cell (`col`, `row`). */
const cellNode = (id: string, col: number, row: number): Node =>
  createNode({ type: 'rect', id, z: id, center: { x: col * 384, y: row * 192 }, size: { width: 256, height: 128 } });

const sceneOf = (...nodes: Node[]): Scene => ({
  id: 's',
  nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
  links: {},
});

describe('lattice projection', () => {
  test('a created node snaps onto the lattice', ({ expect }) => {
    const loose = createNode({
      type: 'rect',
      id: 'n',
      z: 'a',
      center: { x: 30, y: -20 },
      size: { width: 300, height: 90 },
    });
    const intent = constrainIntent(sceneOf(), { kind: 'create', node: loose }, spec);
    expect(intent?.kind === 'create' && nodeBounds(intent.node)).toEqual({ x: -128, y: -64, width: 256, height: 128 });
  });

  test('a node may not be created, moved or resized onto occupied cells', ({ expect }) => {
    const scene = sceneOf(cellNode('a', 0, 0), cellNode('b', 2, 0));
    expect(constrainIntent(scene, { kind: 'create', node: cellNode('c', 0, 0) }, spec)).toBeUndefined();
    // Two pitches right lands on b.
    expect(constrainIntent(scene, { kind: 'move', ids: ['a'], delta: { x: 768, y: 0 } }, spec)).toBeUndefined();
    // Widening a to three cells reaches column 1 only, which is free; to five it reaches b.
    expect(
      constrainIntent(scene, { kind: 'resize', id: 'a', bounds: { x: -512, y: -64, width: 1024, height: 128 } }, spec),
    ).toBeDefined();
    expect(
      constrainIntent(scene, { kind: 'resize', id: 'a', bounds: { x: -896, y: -64, width: 1792, height: 128 } }, spec),
    ).toBeUndefined();
  });

  test('a move snaps each node to the nearest cell, and nodes moved together may not overlap', ({ expect }) => {
    const scene = sceneOf(cellNode('a', 0, 0), cellNode('b', 1, 0));
    // Most of a pitch down: both land one row down.
    const moved = constrainIntent(scene, { kind: 'move', ids: ['a', 'b'], delta: { x: 20, y: 170 } }, spec);
    expect(moved?.kind).toBe('batch');
    // Moving a and b together past each other is fine: neither collides with the other's old cell.
    expect(constrainIntent(scene, { kind: 'move', ids: ['a', 'b'], delta: { x: 384, y: 0 } }, spec)).toBeDefined();
    // Moving a alone onto b is refused.
    expect(constrainIntent(scene, { kind: 'move', ids: ['a'], delta: { x: 384, y: 0 } }, spec)).toBeUndefined();
  });

  test('a geometry update snaps; any other update passes through', ({ expect }) => {
    const scene = sceneOf(cellNode('a', 0, 0));
    const update = constrainIntent(scene, { kind: 'update', id: 'a', values: { center: { x: 400, y: 10 } } }, spec);
    expect(update?.kind === 'update' && 'center' in update.values && update.values.center).toEqual({ x: 384, y: 0 });
    const label = { kind: 'update' as const, id: 'a', values: { label: 'A' } };
    expect(constrainIntent(scene, label, spec)).toBe(label);
  });

  test('a batch is refused whole when any step overlaps, and auto layout is refused', ({ expect }) => {
    const scene = sceneOf(cellNode('a', 0, 0));
    const batch = constrainIntent(
      scene,
      {
        kind: 'batch',
        intents: [
          { kind: 'create', node: cellNode('b', 1, 0) },
          { kind: 'create', node: cellNode('c', 1, 0) },
        ],
      },
      spec,
    );
    expect(batch).toBeUndefined();
    expect(constrainIntent(scene, { kind: 'layout' }, spec)).toBeUndefined();
  });

  test('the projection applies what fits and leaves the scene unchanged otherwise', ({ expect }) => {
    const registry = Registry.make();
    const store = createMemoryStore([sceneOf(cellNode('a', 0, 0))]);
    const projection = createLatticeProjection({ registry, store, sceneId: 's' });
    projection.apply({ kind: 'create', node: cellNode('b', 0, 0) });
    expect(Object.keys(registry.get(projection.scene).nodes)).toEqual(['a']);
    projection.apply({ kind: 'create', node: cellNode('b', 1, 1) });
    expect(Object.keys(registry.get(projection.scene).nodes)).toEqual(['a', 'b']);
    expect(projection.capabilities.layout).toBe(false);
  });
});
