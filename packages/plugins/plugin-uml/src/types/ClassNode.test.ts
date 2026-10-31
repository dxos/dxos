//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import {
  createNodeRegistry,
  defaultNodePrototypes,
  defaultNodeTypes,
  fromViewportIntent,
  kindNodeDef,
  nodeTitle,
  partValues,
  toViewportLayout,
} from '@dxos/react-ui-canvas';
import { fromRenderList2D, toRenderList2D } from '@dxos/react-ui-canvas/headless';
import { Scene } from '@dxos/scene';

import * as ClassNode from './ClassNode.ts';

const frame = { id: 'c', z: 'a1', center: { x: 0, y: 0 }, size: { width: 256, height: 256 } };

/** A layout of one class and the document that draws it. */
const documentOf = (element: Scene.LayoutRecord2D['elements'][string]) => {
  const layout: Scene.LayoutRecord2D = { id: 'main', dim: '2d', elements: { [element.id]: element } };
  const document: Scene.SceneDocument = {
    scenes: [{ id: 'root', dim: '2d', layout: 'main', camera: { center: { x: 0, y: 0 }, zoom: 1 } }],
    layouts: [layout],
    models: [],
  };
  return { layout, document };
};

describe('ClassNode', () => {
  test('is an element kind: a new class is a valid 2D element, its fields checked by the kind registry', ({
    expect,
  }) => {
    const element = ClassNode.make(frame);
    expect(Schema.is(Scene.Element2D)(element)).toBe(true);
    expect(ClassNode.kinds.validate(element)).toEqual({ ok: true });
    expect(ClassNode.kinds.validate({ ...element, methods: 'save()' }).ok).toBe(false);
    expect(ClassNode.isClassNode(element) && [element.label, element.attributes, element.methods]).toEqual([
      'Class',
      ['id: string'],
      ['save(): void'],
    ]);
  });

  // The kind as a host composes it for the canvas engine, without its view (a component the engine never calls here).
  const registry = createNodeRegistry(
    {
      ...defaultNodeTypes,
      [ClassNode.TYPE]: { ...kindNodeDef(ClassNode.TYPE, ClassNode.spec), component: () => null },
    },
    defaultNodePrototypes,
  );

  test("joins the canvas's types, its name the main text and its members edited one per line", ({ expect }) => {
    expect(Object.keys(registry)).toContain('class');
    const node = registry.class.create(frame);
    expect(Schema.is(registry.class.schema)(node)).toBe(true);
    expect(nodeTitle(registry, node)).toBe('Class');
    expect(partValues(registry, node, 'methods', 'greet()\n\n hire() ')).toEqual({ methods: ['greet()', 'hire()'] });
  });

  test('is drawn with its members and written back with them at the top of the element', ({ expect }) => {
    const { layout, document } = documentOf({
      ...ClassNode.make(frame),
      label: 'Person',
      attributes: ['name: string'],
    });
    const drawn = toViewportLayout(layout, ClassNode.kinds);
    const node = toRenderList2D({ ...document, layouts: [drawn] }, drawn).nodes.c;
    expect(ClassNode.isClassNode(node) && [node.label, node.attributes, node.methods]).toEqual([
      'Person',
      ['name: string'],
      ['save(): void'],
    ]);

    // The engine moves the class and edits a member; the write lands as the kind's element.
    const moved = { ...node, center: { x: 64, y: 0 }, methods: ['greet()'] };
    const written = fromRenderList2D({ id: 'main', nodes: { c: moved }, links: {} }).layout.elements.c;
    const intent = fromViewportIntent({ kind: 'update', id: 'c', path: [], value: written }, layout, ClassNode.kinds);
    const value = intent.kind === 'update' ? intent.value : undefined;
    expect(value).toMatchObject({ center: { x: 64, y: 0 }, attributes: ['name: string'], methods: ['greet()'] });
    expect(value).not.toHaveProperty('props');
    expect(ClassNode.kinds.validate(Object(value))).toEqual({ ok: true });
  });

  test('a class written before keeps its members under the canvas fields and still draws', ({ expect }) => {
    const { label, attributes, methods, ...base } = ClassNode.make(frame);
    const { layout, document } = documentOf({ ...base, label, props: { canvas: { attributes, methods } } });
    const drawn = toViewportLayout(layout, ClassNode.kinds);
    const node = toRenderList2D({ ...document, layouts: [drawn] }, drawn).nodes.c;
    expect(ClassNode.isClassNode(node) && node.methods).toEqual(['save(): void']);
  });
});
