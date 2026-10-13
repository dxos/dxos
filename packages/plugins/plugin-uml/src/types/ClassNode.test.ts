//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  SceneBuilder,
  createNodeRegistry,
  defaultNodePrototypes,
  defaultNodeTypes,
  nodeTitle,
  partValues,
} from '@dxos/react-ui-canvas/scene';

import * as ClassNode from './ClassNode.ts';

describe('ClassNode', () => {
  // The type as a host composes it, without its view (a component the engine never calls here).
  const registry = createNodeRegistry(
    { ...defaultNodeTypes, class: { ...ClassNode.spec, component: () => null } },
    defaultNodePrototypes,
  );

  test('joins the built-in types, and a fixture of it builds against its schema', ({ expect }) => {
    expect(Object.keys(registry)).toContain('class');
    const {
      scenes: [scene],
    } = SceneBuilder.scene('s', [
      SceneBuilder.node('class', 'c', { x: 0, y: 0, width: 256, height: 256 }).properties({ label: 'Person' }),
    ]).build(registry);
    const node = scene.nodes.c;
    expect(ClassNode.isClassNode(node) && [node.label, node.attributes, node.methods]).toEqual([
      'Person',
      ['id: string'],
      ['save(): void'],
    ]);
    // Its name is its main text, and its members edit one per line.
    expect(nodeTitle(registry, node)).toBe('Person');
    expect(partValues(registry, node, 'methods', 'greet()\n\n hire() ')).toEqual({ methods: ['greet()', 'hire()'] });
  });
});
