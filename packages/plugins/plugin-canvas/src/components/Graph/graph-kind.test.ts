//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { createNodeRegistry, defaultNodePrototypes, defaultNodeTypes, kindNodeDef } from '@dxos/react-ui-canvas';

import { graphSpec } from './index.ts';

describe('the graph kind', () => {
  test('names no prototype, so it takes none of the card or the box', ({ expect }) => {
    const registry = createNodeRegistry(
      { ...defaultNodeTypes, 'space-graph': kindNodeDef('space-graph', graphSpec) },
      defaultNodePrototypes,
    );
    const space = registry['space-graph'];
    expect(space.ellipse).toBe(true);
    expect([space.bare, space.outline]).toEqual([undefined, true]);
    expect(space.minSize).toEqual({ width: 120, height: 120 });
    // A new graph stores its seed alone: the rest are the schema's defaults, which the Properties panel shows.
    const made = space.create({ id: 's', z: 'a0', center: { x: 0, y: 0 }, size: { width: 384, height: 384 } });
    expect(Reflect.get(made, 'data')).toEqual({ seed: 7 });
  });
});
