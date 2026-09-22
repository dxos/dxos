//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { solve } from '../model/projections/constrained.ts';
import { layoutGraph } from '../model/projections/dynamic.ts';
import { MAJOR_GRID, type Scene } from '../model/types.ts';
import { nodeBounds } from './shapes.ts';
import { createClassSceneTree, createSceneTree } from './testing.ts';

/** Every edge of every node lies on the grid, which is what move and resize snap to. */
const offGrid = (scene: Scene): string[] =>
  Object.values(scene.nodes)
    .filter((node) => {
      const { x, y, width, height } = nodeBounds(node);
      return [x, y, width, height].some((value) => value % MAJOR_GRID !== 0);
    })
    .map(({ id }) => id);

describe('initial layouts conform to the major grid', () => {
  test('scene tree fixture', ({ expect }) => {
    for (const scene of createSceneTree(3).scenes) {
      expect(offGrid(scene)).toEqual([]);
    }
  });

  test('class scene tree fixture', ({ expect }) => {
    const { scenes, root } = createClassSceneTree();
    expect(scenes.map(({ id }) => id)).toContain(root);
    // Three levels: the root, its two subsystems, and one leaf under each.
    expect(scenes).toHaveLength(5);
    for (const scene of scenes) {
      expect(offGrid(scene)).toEqual([]);
    }
  });

  test('constrained solver defaults', ({ expect }) => {
    const scene = solve({
      nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
      constraints: [
        { subject: 'B', relation: 'east', object: 'A' },
        { subject: 'C', relation: 'south', object: 'A' },
      ],
    });
    expect(offGrid(scene)).toEqual([]);
  });

  test('dynamic layout defaults', ({ expect }) => {
    const scene = layoutGraph(
      {
        nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
        edges: [
          { id: 'ab', from: 'a', to: 'b' },
          { id: 'ac', from: 'a', to: 'c' },
        ],
      },
      { positions: {} },
    );
    expect(offGrid(scene)).toEqual([]);
  });
});
