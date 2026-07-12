//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import { describe, test } from 'vitest';

import { GraphModel } from '@dxos/graph';

import { Engine } from './engine';
import { ForceProjector } from './projector/force-projector';
import { TypeRegistry } from './registry/type-registry';

describe('Engine', () => {
  test('binds model and projects nodes', ({ expect }) => {
    const registry = Registry.make();
    const model = new GraphModel.ReactiveGraphModel(registry);
    model.addNode({ id: 'a' });
    model.addNode({ id: 'b' });
    model.addEdge({ source: 'a', target: 'b' });

    const engine = new Engine({
      model,
      registry: new TypeRegistry(),
      projector: new ForceProjector(),
    });
    engine.start();
    expect(engine.layout.nodes).toHaveLength(2);
    engine.stop();
  });

  test('re-projects on model change', ({ expect }) => {
    const registry = Registry.make();
    const model = new GraphModel.ReactiveGraphModel(registry);
    model.addNode({ id: 'a' });

    const engine = new Engine({
      model,
      registry: new TypeRegistry(),
      projector: new ForceProjector(),
    });
    engine.start();
    model.addNode({ id: 'b' });
    expect(engine.layout.nodes).toHaveLength(2);
    engine.stop();
  });

  test('hitTest returns node under world coordinate', ({ expect }) => {
    const registry = Registry.make();
    const model = new GraphModel.ReactiveGraphModel(registry);
    model.addNode({ id: 'a' });

    const engine = new Engine({
      model,
      registry: new TypeRegistry(),
      projector: new ForceProjector(),
    });
    engine.start();
    const node = engine.layout.nodes[0];
    node.x = 50;
    node.y = 50;
    node.r = 10;
    engine.viewport.setSize({ width: 200, height: 200 });
    const hit = engine.hitTestWorld(50, 50);
    expect(hit?.kind).toBe('node');
    engine.stop();
  });
});
