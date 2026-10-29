//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/reactivity/AtomRegistry';
import { describe, expect, test } from 'vitest';

import { Obj } from '@dxos/echo';
import {
  type ConstrainedModel,
  type GraphModel,
  type Overlay,
  createConstrainedProjection,
  createDynamicProjection,
  defaultNodeRegistry,
} from '@dxos/react-ui-canvas';
import { patchSource, recordChanges } from '@dxos/react-ui-canvas/headless';
import { Scene } from '@dxos/scene';

import { isConstrainedModel, isGraphModel, isOverlay, layoutModelAtom } from './projection-model.ts';

const MODEL: ConstrainedModel = {
  nodes: [{ id: 'A' }, { id: 'B' }],
  constraints: [{ subject: 'B', relation: 'east', object: 'A' }],
};

const GRAPH: GraphModel = { nodes: [{ id: 'root' }, { id: 'leaf' }], edges: [{ id: 'e', from: 'root', to: 'leaf' }] };

const emptyLayout = () => Obj.make(Scene.Layout2D, { key: 'layout', elements: {} });

/** The constrained projection over a model kept in `layout`, as the article binds a constrained canvas. */
const constrainedOver = (layout: Scene.Layout2D) => {
  const registry = Registry.make();
  const { atom, dispose } = layoutModelAtom(registry, layout, ['constrained'], isConstrainedModel, MODEL);
  const projection = createConstrainedProjection({ registry, model: atom, options: { nodes: defaultNodeRegistry } });
  return { registry, atom, projection, dispose };
};

describe('layoutModelAtom', () => {
  test('a constrained move rewrites the stored constraints and survives reopening', () => {
    const layout = emptyLayout();
    const first = constrainedOver(layout);
    // B dropped well below A is now south of it.
    first.projection.apply({ kind: 'move', ids: ['B'], delta: { x: -400, y: 400 } });
    const stored: unknown = layout.props?.constrained;
    expect(isConstrainedModel(stored) && stored.constraints).toContainEqual({
      subject: 'B',
      relation: 'south',
      object: 'A',
    });
    first.dispose();

    const reopened = constrainedOver(layout);
    expect(reopened.registry.get(reopened.atom)).toEqual(stored);
    reopened.dispose();
  });

  test('undo restores the earlier constraints, in the layout too', () => {
    const layout = emptyLayout();
    const { projection, dispose } = constrainedOver(layout);
    const source = projection.model;
    if (!source) {
      throw new Error('The constrained projection has a model source.');
    }
    const [change] = recordChanges([source], () =>
      projection.apply({ kind: 'move', ids: ['B'], delta: { x: -400, y: 400 } }),
    );
    if (!change) {
      throw new Error('The move changed the model.');
    }
    patchSource(source, { from: change.after, to: change.before, paths: change.paths });
    expect(layout.props?.constrained).toEqual(MODEL);
    dispose();
  });

  test("the dynamic projection's graph and overlay round-trip through the layout", () => {
    const layout = emptyLayout();
    const registry = Registry.make();
    const graph = layoutModelAtom(registry, layout, ['dynamic', 'graph'], isGraphModel, GRAPH);
    const overlay = layoutModelAtom<Overlay>(registry, layout, ['dynamic', 'overlay'], isOverlay, { positions: {} });
    const projection = createDynamicProjection({
      registry,
      graph: graph.atom,
      overlay: overlay.atom,
      options: { nodes: defaultNodeRegistry },
    });
    projection.apply({ kind: 'move', ids: ['leaf'], delta: { x: 320, y: 0 } });
    const stored: unknown = layout.props?.dynamic;
    expect(stored).toMatchObject({ graph: GRAPH });
    const storedOverlay: unknown = Reflect.get(Object(stored), 'overlay');
    expect(isOverlay(storedOverlay) && Object.keys(storedOverlay.positions)).toContain('leaf');
    graph.dispose();
    overlay.dispose();

    const again = Registry.make();
    const reopened = layoutModelAtom<Overlay>(again, layout, ['dynamic', 'overlay'], isOverlay, { positions: {} });
    expect(Object.keys(again.get(reopened.atom).positions)).toContain('leaf');
    reopened.dispose();
  });
});
