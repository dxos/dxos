//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { UnknownNodeView } from '../components/SceneLayer/SceneLayer.tsx';
import { nodePorts } from '../utils/ports.ts';
import { nodeBounds } from '../utils/shapes.ts';
import { type NodeDef, type NodeRegistry, defaultNodeRegistry, nodeDef } from './registry.ts';
import { type NodeBase, Scene, createSceneSchema, isBuiltinNode, nodeBase } from './types.ts';

/** A host type: a compute function with typed input and output ports. */
const FunctionNode = Schema.Struct({ type: Schema.Literal('function'), ...nodeBase, fn: Schema.String });

const functionDef: NodeDef = {
  type: 'function',
  name: 'Function',
  icon: 'ph--function--regular',
  key: 'F',
  group: 'compute',
  schema: FunctionNode,
  component: UnknownNodeView,
  create: ({ id, z, center, size }) => ({ type: 'function', id, z, center, size, fn: 'identity' }),
  defaultSize: { width: 128, height: 64 },
  ports: () => [
    { id: 'in', side: 'w', offset: 0.5, accepts: 'in' },
    { id: 'out', side: 'e', offset: 0.5, accepts: 'out' },
  ],
};

const registry: NodeRegistry = { ...defaultNodeRegistry, function: functionDef };

describe('registry', () => {
  test('a host composes the scene schema from its registry', ({ expect }) => {
    const HostScene = createSceneSchema(Object.values(registry).map((def) => def.schema));
    const fn = functionDef.create({ id: 'f', z: 'a', center: { x: 64, y: 64 }, size: functionDef.defaultSize });
    const scene = { id: 's', nodes: { f: fn }, links: {} };
    expect(Schema.is(HostScene)(scene)).toBe(true);
    // The built-in schema rejects the host type; the engine still handles the node as a `NodeBase`.
    expect(Schema.is(Scene)(scene)).toBe(false);
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
