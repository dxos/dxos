//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { MAJOR_GRID, type Point } from '@dxos/scene';

import { defaultNodeRegistry } from '../components/index.ts';
import { type RenderList2D } from '../model/index.ts';
import { layoutGraph, solve } from '../modes/index.ts';
import { nodeBounds } from '../utils/index.ts';
import { createModelViewTree, createViewTree } from './view-tree.ts';

/** Every edge of every node lies on the grid, which is what move and resize snap to. */
const offGrid = (scene: RenderList2D): string[] =>
  Object.values(scene.nodes)
    .filter((node) => {
      const { x, y, width, height } = nodeBounds(node);
      return [x, y, width, height].some((value) => value % MAJOR_GRID !== 0);
    })
    .map(({ id }) => id);

/** How far the middle of the scene's content sits from the origin. */
const offCenter = (scene: RenderList2D): Point => {
  const bounds = Object.values(scene.nodes).map(nodeBounds);
  const spread = (low: number[], high: number[]) => (Math.min(...low) + Math.max(...high)) / 2;
  return {
    x: spread(
      bounds.map(({ x }) => x),
      bounds.map(({ x, width }) => x + width),
    ),
    y: spread(
      bounds.map(({ y }) => y),
      bounds.map(({ y, height }) => y + height),
    ),
  };
};

describe('initial layouts conform to the major grid', () => {
  test('scene tree fixture', ({ expect }) => {
    for (const scene of createViewTree(3).views) {
      expect(offGrid(scene)).toEqual([]);
    }
  });

  test('model scene tree fixture', ({ expect }) => {
    const { views, root } = createModelViewTree();
    expect(views.map(({ id }) => id)).toContain(root);
    // Three levels: the root, its two subsystems, and one leaf under each.
    expect(views).toHaveLength(5);
    for (const scene of views) {
      expect(offGrid(scene)).toEqual([]);
    }
  });

  test('constrained solver defaults', ({ expect }) => {
    expect(offGrid(constrained())).toEqual([]);
  });

  test('dynamic layout defaults', ({ expect }) => {
    expect(offGrid(dynamic())).toEqual([]);
  });
});

describe('generated layouts straddle the origin', () => {
  // Half a major cell: a node spans an odd number of cells, so the exact middle of a run of them lies
  // between grid lines and the layout stays snapped rather than exactly centred.
  const tolerance = MAJOR_GRID / 2;

  test('constrained solver', ({ expect }) => {
    const { x, y } = offCenter(constrained());
    expect(Math.abs(x)).toBeLessThanOrEqual(tolerance);
    expect(Math.abs(y)).toBeLessThanOrEqual(tolerance);
  });

  test('dynamic layout', ({ expect }) => {
    const { x, y } = offCenter(dynamic());
    expect(Math.abs(x)).toBeLessThanOrEqual(tolerance);
    expect(Math.abs(y)).toBeLessThanOrEqual(tolerance);
  });
});

const constrained = (): RenderList2D =>
  solve(
    {
      nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
      constraints: [
        { subject: 'B', relation: 'east', object: 'A' },
        { subject: 'C', relation: 'south', object: 'A' },
      ],
    },
    { nodes: defaultNodeRegistry },
  );

const dynamic = (): RenderList2D =>
  layoutGraph(
    {
      nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      edges: [
        { id: 'ab', from: 'a', to: 'b' },
        { id: 'ac', from: 'a', to: 'c' },
      ],
    },
    { positions: {} },
    { nodes: defaultNodeRegistry },
  );
