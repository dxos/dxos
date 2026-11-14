//
// Copyright 2026 DXOS.org
//

import { describe, expect, test, vi } from 'vitest';

import { type LayoutIntent, type Scene, applyIntent } from '@dxos/scene';

import { type RenderList2D } from '../model/index.ts';
import { createNode } from '../utils/index.ts';
import { toRenderList2D } from './render-list.ts';
import { type LayoutWrite, applyLayoutWrites, layoutWrites } from './writes.ts';

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

const moved = (view: RenderList2D, dx: number): RenderList2D => ({
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

describe('a 2D solid', () => {
  const overlapping = (): Record<string, Scene.Element2D> => ({
    a: { id: 'a', type: 'rect', z: 'a0', center: { x: 50, y: 50 }, size: { width: 100, height: 100 } },
    b: { id: 'b', type: 'ellipse', z: 'a1', center: { x: 100, y: 100 }, size: { width: 100, height: 100 } },
  });

  const joined = (kind: 'join' | 'subtract') => {
    const doc = document(overlapping());
    const intent: LayoutIntent =
      kind === 'join'
        ? { kind: 'join', id: 's', operands: ['a', 'b'] }
        : { kind: 'subtract', id: 's', base: 'a', tool: 'b' };
    return { ...doc, layouts: [applyIntent(layoutOf(doc), intent)] };
  };

  test('is drawn in place of its operands, with the outline they make', () => {
    const doc = joined('join');
    const view = toRenderList2D(doc, layoutOf(doc));
    expect(Object.keys(view.nodes)).toEqual(['s']);
    expect(view.nodes.s).toMatchObject({
      type: 'solid',
      op: 'union',
      operands: 'a b',
      center: { x: 75, y: 75 },
      size: { width: 150, height: 150 },
    });
    const rings = Reflect.get(view.nodes.s, 'rings');
    expect(rings).toHaveLength(1);
    // The box's corners and the ellipse's curve: far more points than either a box or a blank frame has.
    expect(rings[0].length).toBeGreaterThan(40);
  });

  test('a subtraction leaves the base with the tool cut out of it', () => {
    const doc = joined('subtract');
    const view = toRenderList2D(doc, layoutOf(doc));
    expect(view.nodes.s).toMatchObject({
      op: 'difference',
      center: { x: 50, y: 50 },
      size: { width: 100, height: 100 },
    });
    const [ring] = Reflect.get(view.nodes.s, 'rings');
    expect(ring.some(({ x, y }: { x: number; y: number }) => x > 0.5 && x < 1 && y > 0.5 && y < 1)).toBe(true);
  });

  test('moved, it writes its place and not its outline, and reads back the same shape there', () => {
    const doc = joined('join');
    const view = toRenderList2D(doc, layoutOf(doc));
    const [write] = layoutWrites(doc, { main: view }, { main: moved(view, 30) });
    const layout = write.kind === 'layout' ? applyIntent(layoutOf(doc), write.intent) : layoutOf(doc);
    expect(layout.elements.s.center).toEqual({ x: 105, y: 75 });
    expect(layout.elements.s.props).toMatchObject({ op: 'union', operands: 'a b' });
    expect(JSON.stringify(layout.elements.s)).not.toContain('rings');
    expect([layout.elements.a.hidden, layout.elements.b.hidden]).toEqual([true, true]);
    const again = toRenderList2D({ ...doc, layouts: [layout] }, layout);
    expect(Reflect.get(again.nodes.s, 'rings')).toEqual(Reflect.get(view.nodes.s, 'rings'));
    // Read again with nothing changed, it writes nothing.
    expect(layoutWrites({ ...doc, layouts: [layout] }, { main: again }, { main: again })).toEqual([]);
  });

  test('made of placed objects, which take their size from the model, it is framed as it is read', () => {
    // The layout holds each operand's place and not its size, so the model makes the solid with no frame.
    const doc: Scene.SceneDocument = {
      scenes: [{ id: 's', dim: '2d', layout: 'main', camera: { center: { x: 0, y: 0 }, zoom: 1 } }],
      layouts: [
        {
          id: 'main',
          dim: '2d',
          model: 'm',
          elements: {
            a: { id: 'a', object: 'box', center: { x: 50, y: 50 } },
            b: { id: 'b', object: 'box', center: { x: 100, y: 100 } },
          },
        },
      ],
      models: [
        { id: 'm', dim: '2d', objects: { box: { id: 'box', type: 'rect', size: { width: 100, height: 100 } } } },
      ],
    };
    const layout = applyIntent(layoutOf(doc), { kind: 'join', id: 's', operands: ['a', 'b'] });
    expect(layout.elements.s.center).toBeUndefined();
    const view = toRenderList2D({ ...doc, layouts: [layout] }, layout);
    expect(Object.keys(view.nodes)).toEqual(['s']);
    expect(view.nodes.s).toMatchObject({ type: 'solid', center: { x: 75, y: 75 }, size: { width: 150, height: 150 } });
    // Two boxes that overlap corner to corner: eight corners in one ring.
    expect(Reflect.get(view.nodes.s, 'rings')).toHaveLength(1);
    expect(Reflect.get(view.nodes.s, 'rings')[0]).toHaveLength(8);
    // Moved on the canvas, it keeps the frame it was drawn in.
    const [write] = layoutWrites({ ...doc, layouts: [layout] }, { main: view }, { main: moved(view, 30) });
    const next = write.kind === 'layout' ? applyIntent(layout, write.intent) : layout;
    expect([next.elements.s.center, next.elements.s.size]).toEqual([
      { x: 105, y: 75 },
      { width: 150, height: 150 },
    ]);
  });

  test('deleted, its operands are drawn again', () => {
    const doc = joined('join');
    const layout = applyIntent(layoutOf(doc), { kind: 'delete', ids: ['s'] });
    expect(Object.keys(toRenderList2D({ ...doc, layouts: [layout] }, layout).nodes).sort()).toEqual(['a', 'b']);
  });
});

describe('layoutWrites', () => {
  test('a drag of 200 elements writes once, to the layout that owns them', () => {
    const doc = document(rects(200));
    const view = toRenderList2D(doc, layoutOf(doc));
    const writes = layoutWrites(doc, { main: view }, { main: moved(view, 10) });
    expect(writes).toHaveLength(1);
    const [write] = writes;
    expect(write).toMatchObject({ kind: 'layout', layout: 'main', created: false });
    const updates = write.kind === 'layout' ? flat(write.intent).filter((intent) => intent.kind === 'update') : [];
    expect(updates).toHaveLength(200);
  });

  test('a RenderList2D that did not change writes nothing', () => {
    const doc = document(rects(3));
    const view = toRenderList2D(doc, layoutOf(doc));
    expect(layoutWrites(doc, { main: view }, { main: view })).toEqual([]);
  });

  test('a moved element keeps the fields other writers own (its DSL identity)', () => {
    const doc = document({ a: { ...rects(1).r0, id: 'a', dsl: { object: 'A', element: 'a' } } });
    const view = toRenderList2D(doc, layoutOf(doc));
    const [write] = layoutWrites(doc, { main: view }, { main: moved(view, 10) });
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
    const view = toRenderList2D(doc, layout);
    const node = {
      ...createNode({ type: 'rect', id: 'n', z: 'b0', center: { x: 64, y: 64 }, size: { width: 64, height: 64 } }),
      layer: 'default',
    };
    const [write] = layoutWrites(doc, { main: view }, { main: { ...view, nodes: { ...view.nodes, n: node } } });
    expect(write.kind === 'layout' && applyIntent(layout, write.intent).elements.n).toMatchObject({
      type: 'rect',
      center: { x: 64, y: 64 },
    });
  });

  test("a new portal writes its scene's layout, then the object it places, then the element placing it", () => {
    const doc = document({});
    const view = toRenderList2D(doc, layoutOf(doc));
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
    const writes = layoutWrites(doc, { main: view }, next);
    expect(writes.map((write) => write.kind)).toEqual(['layout', 'define', 'layout']);
    expect(writes[0]).toMatchObject({ kind: 'layout', layout: 'inner', created: true });
    expect(writes[1]).toMatchObject({ kind: 'define', object: { id: 'view:inner', parts: 'inner' } });
    expect(writes[2]).toMatchObject({ kind: 'layout', layout: 'main', created: false });
  });

  test('a new composite is written as one: the layout the host creates bare takes its kind and anonymity', () => {
    const doc = document({});
    const view = toRenderList2D(doc, layoutOf(doc));
    const node = {
      ...createNode({ type: 'rect', id: 'n', z: 'a0', center: { x: 0, y: 0 }, size: { width: 16, height: 16 } }),
      layer: 'default',
    };
    const group = { id: 'g', kind: 'composite' as const, anonymous: true, nodes: { n: node }, links: {} };
    const [write] = layoutWrites(doc, { main: view }, { main: view, g: group });
    expect(write).toMatchObject({ kind: 'layout', layout: 'g', created: true });
    const bare: Scene.LayoutRecord2D = { id: 'g', dim: '2d', model: 'm', elements: {} };
    expect(write.kind === 'layout' && applyIntent(bare, write.intent)).toMatchObject({
      kind: 'composite',
      anonymous: true,
      elements: { n: { type: 'rect' } },
    });
  });
});

describe('applyLayoutWrites', () => {
  const portal: LayoutWrite[] = [
    { kind: 'layout', layout: 'root', intent: { kind: 'create', element: { id: 'p', object: 'o' } }, created: false },
    { kind: 'layout', layout: 'inside', intent: { kind: 'create', element: { id: 'q', type: 'rect' } }, created: true },
    { kind: 'define', object: { id: 'o', type: 'view', parts: 'inside' } },
  ];

  test('a change that writes more than once (a new portal) is one transaction, so it undoes in one step', () => {
    const log: string[] = [];
    const onTransaction = vi.fn((change: () => void) => {
      log.push('begin');
      change();
      log.push('end');
    });
    applyLayoutWrites(portal, {
      model: 'm',
      onIntent: (layout) => log.push(layout),
      onModelIntent: (intent) => (log.push(intent.kind), []),
      onTransaction,
    });
    expect(log).toEqual(['begin', 'root', 'inside', 'define', 'end']);
  });

  test('a single write (a drag) is not wrapped, so it stays a field-level step', () => {
    const onTransaction = vi.fn();
    const onIntent = vi.fn();
    applyLayoutWrites(portal.slice(0, 1), { model: 'm', onIntent, onTransaction });
    expect(onTransaction).not.toHaveBeenCalled();
    expect(onIntent).toHaveBeenCalledTimes(1);
  });
});
