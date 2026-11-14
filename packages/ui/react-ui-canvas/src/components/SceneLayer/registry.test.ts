//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { MAJOR_GRID, type NodeBase, NoteNode, RectNode, isBuiltinNode, isShapeNode, nodeBase } from '@dxos/scene';

import { type CreateProps, type NodeDef, type NodeRegistry, createNodeRegistry, nodeDef } from '../../model/index.ts';
import { SHAPE_FOLD, SHAPE_RECIPES, createNode, nodeBounds, nodePorts, nominalSize } from '../../utils/index.ts';
import { boxPrototype, defaultNodeRegistry } from './registry.ts';
import { UnknownNodeView } from './SceneLayer.tsx';

/** A host type: a compute function with typed input and output ports. */
const FunctionNode = Schema.Struct({ type: Schema.Literal('function'), ...nodeBase, fn: Schema.String });

const functionDef: NodeDef = {
  type: 'function',
  name: 'Function',
  icon: 'ph--function--regular',
  key: 'U',
  group: 'compute',
  schema: FunctionNode,
  component: UnknownNodeView,
  create: ({ id, z, center, size }) => ({ type: 'function', id, z, center, size, fn: 'identity' }),
  defaultSize: { width: 2, height: 1 },
  ports: () => [
    { id: 'in', side: 'w', offset: 0.5, accepts: 'in' },
    { id: 'out', side: 'e', offset: 0.5, accepts: 'out' },
  ],
};

const registry: NodeRegistry = { ...defaultNodeRegistry, function: functionDef };

describe('registry', () => {
  test("a host type's schema is its registry entry's; the engine handles the node as a `NodeBase`", ({ expect }) => {
    const size = nominalSize(functionDef.defaultSize);
    const center = { x: MAJOR_GRID, y: MAJOR_GRID };
    const fn = functionDef.create({ id: 'f', z: 'a', center, size });
    expect(Schema.is(functionDef.schema)(fn)).toBe(true);
    // A built-in schema rejects the host type; the engine still handles the node as a `NodeBase`.
    expect(Schema.is(RectNode)(fn)).toBe(false);
    expect(isBuiltinNode(fn)).toBe(false);
    expect(nodeBounds(fn)).toEqual({
      x: center.x - size.width / 2,
      y: center.y - size.height / 2,
      ...size,
    });
  });

  test('the registry supplies the ports, frame and definition of a host node', ({ expect }) => {
    const fn: NodeBase = {
      type: 'function',
      id: 'f',
      z: 'a',
      center: { x: 64, y: 64 },
      size: { width: 128, height: 64 },
    };
    expect(nodeDef(registry, fn)?.group).toBe('compute');
    expect(nodePorts(registry, fn).map((port) => [port.id, port.accepts])).toEqual([
      ['in', 'in'],
      ['out', 'out'],
    ]);
    // A type the registry does not know still has its frame and the default ports.
    const stranger: NodeBase = { ...fn, type: 'stranger' };
    expect(nodeDef(registry, stranger)).toBeUndefined();
    expect(nodePorts(registry, stranger).length).toBeGreaterThan(0);
  });
});

describe('node registry', () => {
  test('each recipe has a tool that drags out a shape naming it, and the shape type itself has none', ({ expect }) => {
    const { shape } = defaultNodeRegistry;
    // The type draws every recipe's node; the palette offers the recipes, not the type.
    expect(shape.palette).toBe(false);
    for (const recipe of SHAPE_RECIPES) {
      const tool = defaultNodeRegistry[recipe.id];
      expect([tool.name, tool.icon, tool.fold, tool.palette]).toEqual([
        recipe.name,
        recipe.icon,
        SHAPE_FOLD,
        undefined,
      ]);
      const node = tool.create({ id: 'a', z: 'a', center: { x: 96, y: 48 }, size: { width: 192, height: 96 } });
      expect(Schema.is(shape.schema)(node)).toBe(true);
      expect(isShapeNode(node) && [node.type, node.recipe, node.params]).toEqual(['shape', recipe.id, undefined]);
      // A shape to drag out to a size, not one placed point by point.
      expect(tool.createFromPoints).toBeUndefined();
    }
    expect(defaultNodeRegistry.arrow.key).toBe('A');
  });

  test("a shape's outline is its recipe's, in its frame and with its parameters", ({ expect }) => {
    const { shape } = defaultNodeRegistry;
    const node = {
      ...defaultNodeRegistry.arrow.create({
        id: 'a',
        z: 'a',
        center: { x: 100, y: 50 },
        size: { width: 200, height: 100 },
      }),
      params: { head: 0.5, shaft: 0.6 },
    };
    // The shaft's top edge, the head's back corner, the tip: square corners with no radius.
    expect(shape.silhouette?.(node, 0, 0)).toBe('M 0 20 L 150 20 L 150 0 L 200 50 L 150 100 L 150 80 L 0 80 Z');
  });

  test('rectangle and view share the box prototype and differ only where they say so', ({ expect }) => {
    const { rect, view } = defaultNodeRegistry;
    expect(rect.component).toBe(boxPrototype.component);
    expect(rect.resizable).toBe(true);
    expect(view.resizable).toBe(rect.resizable);
    expect(view.portsPerSide).toBe(rect.portsPerSide);
    expect(view.openable).toBe(true);
    expect(rect.openable).toBeUndefined();
    // A prototype is not a type: the palette and the scene schema never see it.
    expect(Object.keys(defaultNodeRegistry)).not.toContain('box');
  });

  test('a type takes its own fields over its prototype chain', ({ expect }) => {
    const registry = createNodeRegistry(
      {
        sticky: {
          extends: 'card',
          name: 'Sticky',
          icon: 'ph--note--regular',
          schema: NoteNode,
          create: (props) => createNode({ type: 'note', ...props }),
          component: defaultNodeRegistry.note.component,
        },
      },
      { box: boxPrototype, card: { extends: 'box', portsPerSide: 1, resizable: false } },
    );
    expect(registry.sticky).toMatchObject({ type: 'sticky', portsPerSide: 1, resizable: false });
    expect(registry.sticky.component).toBe(defaultNodeRegistry.note.component);
    expect(registry.sticky.defaultSize).toEqual(boxPrototype.defaultSize);
  });

  test('a missing prototype, a cycle or a missing field throws', ({ expect }) => {
    const spec = {
      name: 'R',
      icon: 'i',
      schema: RectNode,
      create: (props: CreateProps) => createNode({ type: 'rect', ...props }),
    };
    expect(() => createNodeRegistry({ r: { ...spec, extends: 'nope' } })).toThrow(/Unknown node prototype/);
    expect(() =>
      createNodeRegistry({ r: { ...spec, extends: 'a' } }, { a: { extends: 'b' }, b: { extends: 'a' } }),
    ).toThrow(/cycle/);
    expect(() => createNodeRegistry({ r: spec })).toThrow(/missing a required field/);
  });
});
