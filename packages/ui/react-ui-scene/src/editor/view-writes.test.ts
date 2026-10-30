//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type View, createNode } from '@dxos/react-ui-canvas';
import { type LayoutIntent, type Scene, applyIntent } from '@dxos/scene';

import { toCanvasView } from '../canvas/index.ts';
import { viewWrites } from './view-writes.ts';

const rects = (count: number): Record<string, Scene.Element2D> =>
  Object.fromEntries(
    Array.from({ length: count }, (_, index) => [
      `r${index}`,
      { id: `r${index}`, type: 'rect', center: { x: index * 32, y: 0 }, size: { width: 16, height: 16 } },
    ]),
  );

const document = (elements: Record<string, Scene.Element2D>): Scene.SceneDocument => ({
  scenes: [{ id: 's', dim: '2d', layout: 'main', camera: { center: { x: 0, y: 0 }, zoom: 1 } }],
  layouts: [{ id: 'main', dim: '2d', model: 'm', elements }],
  models: [{ id: 'm', dim: '2d', objects: {} }],
});

const layoutOf = (doc: Scene.SceneDocument) => {
  const layout = doc.layouts[0];
  if (layout.dim !== '2d') {
    throw new Error('2D layout expected');
  }
  return layout;
};

const moved = (view: View, dx: number): View => ({
  ...view,
  nodes: Object.fromEntries(
    Object.entries(view.nodes).map(([id, node]) => [
      id,
      { ...node, center: { x: node.center.x + dx, y: node.center.y } },
    ]),
  ),
});

const flat = (intent: LayoutIntent): LayoutIntent[] =>
  intent.kind === 'batch' ? intent.intents.flatMap(flat) : [intent];

describe('viewWrites', () => {
  test('a drag of 200 elements writes once, to the layout that owns them', () => {
    const doc = document(rects(200));
    const view = toCanvasView(doc, layoutOf(doc));
    const writes = viewWrites(doc, { main: view }, { main: moved(view, 10) });
    expect(writes).toHaveLength(1);
    const [write] = writes;
    expect(write).toMatchObject({ kind: 'layout', layout: 'main', created: false });
    const updates = write.kind === 'layout' ? flat(write.intent).filter((intent) => intent.kind === 'update') : [];
    expect(updates).toHaveLength(200);
  });

  test('a View that did not change writes nothing', () => {
    const doc = document(rects(3));
    const view = toCanvasView(doc, layoutOf(doc));
    expect(viewWrites(doc, { main: view }, { main: view })).toEqual([]);
  });

  test('a moved element keeps the fields other writers own (its DSL identity)', () => {
    const doc = document({ a: { ...rects(1).r0, id: 'a', dsl: { object: 'A', element: 'a' } } });
    const view = toCanvasView(doc, layoutOf(doc));
    const [write] = viewWrites(doc, { main: view }, { main: moved(view, 10) });
    const [update] = write.kind === 'layout' ? flat(write.intent) : [];
    expect(update).toMatchObject({
      kind: 'update',
      id: 'a',
      value: { dsl: { object: 'A', element: 'a' }, center: { x: 10, y: 0 } },
    });
  });

  test('a node the engine creates is written as an element the layout accepts', () => {
    const doc = document(rects(1));
    const layout = layoutOf(doc);
    const view = toCanvasView(doc, layout);
    const node = {
      ...createNode({ type: 'rect', id: 'n', z: 'b0', center: { x: 64, y: 64 }, size: { width: 64, height: 64 } }),
      layer: 'default',
    };
    const [write] = viewWrites(doc, { main: view }, { main: { ...view, nodes: { ...view.nodes, n: node } } });
    expect(write.kind === 'layout' && applyIntent(layout, write.intent).elements.n).toMatchObject({
      type: 'rect',
      center: { x: 64, y: 64 },
    });
  });

  test("a new portal writes its scene's layout, then the object it places, then the element placing it", () => {
    const doc = document({});
    const view = toCanvasView(doc, layoutOf(doc));
    const portal = {
      type: 'view' as const,
      id: 'p',
      z: 'a0',
      center: { x: 0, y: 0 },
      size: { width: 64, height: 64 },
      scene: 'inner',
    };
    const next = {
      main: { ...view, nodes: { p: portal } },
      inner: { id: 'inner', nodes: {}, links: {} },
    };
    const writes = viewWrites(doc, { main: view }, next);
    expect(writes.map((write) => write.kind)).toEqual(['layout', 'define', 'layout']);
    expect(writes[0]).toMatchObject({ kind: 'layout', layout: 'inner', created: true });
    expect(writes[1]).toMatchObject({ kind: 'define', object: { id: 'view:inner', parts: 'inner' } });
    expect(writes[2]).toMatchObject({ kind: 'layout', layout: 'main', created: false });
  });
});
