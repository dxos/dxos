//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { type NodeBase, NoteNode, RectNode, isBuiltinNode, nodeBase } from '@dxos/scene';

import {
  type CreateProps,
  type NodeDef,
  type NodeRegistry,
  View,
  createNodeRegistry,
  createViewSchema,
  nodeDef,
} from '../../model/index.ts';
import { createNode, nodeBounds, nodePorts, nominalSize } from '../../utils/index.ts';
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
  test('a host composes the scene schema from its registry', ({ expect }) => {
    const HostView = createViewSchema(Object.values(registry).map((def) => def.schema));
    const fn = functionDef.create({
      id: 'f',
      z: 'a',
      center: { x: 64, y: 64 },
      size: nominalSize(functionDef.defaultSize),
    });
    const scene = { id: 's', nodes: { f: fn }, links: {} };
    expect(Schema.is(HostView)(scene)).toBe(true);
    // The built-in schema rejects the host type; the engine still handles the node as a `NodeBase`.
    expect(Schema.is(View)(scene)).toBe(false);
    expect(isBuiltinNode(fn)).toBe(false);
    expect(nodeBounds(fn)).toEqual({ x: 0, y: 32, width: 128, height: 64 });
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
