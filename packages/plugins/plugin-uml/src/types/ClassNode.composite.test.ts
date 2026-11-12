//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import {
  compileTemplate,
  createNodeRegistry,
  defaultNodePrototypes,
  defaultNodeTypes,
  isCompiled,
  kindNodeDef,
  templateCompositeId,
} from '@dxos/react-ui-canvas';
import { isInstanceNode } from '@dxos/scene';

import * as ClassNode from './ClassNode.ts';
import { SIZE } from './template.ts';

const COMPOSITE = templateCompositeId(ClassNode.TYPE);

describe('the UML class as a composite object', () => {
  test('its template compiles to three compartments, each bound to a field of the class', () => {
    const result = compileTemplate(ClassNode.spec.template!, COMPOSITE);
    expect(isCompiled(result)).toBe(true);
    if (!isCompiled(result)) {
      return;
    }
    const { nodes } = result.composite;
    expect(Object.keys(nodes).sort()).toEqual(['attributes', 'methods', 'name']);
    expect(nodes.name?.bind).toEqual('label');
    expect(nodes.attributes?.bind).toEqual('attributes');
    expect(nodes.methods?.bind).toEqual('methods');
  });

  test('the name keeps the top, the methods the bottom, and the attributes take what is left', () => {
    const result = compileTemplate(ClassNode.spec.template!, COMPOSITE);
    if (!isCompiled(result)) {
      throw new Error('the template does not compile');
    }
    const { nodes } = result.composite;
    expect(nodes.name?.constrain).toEqual({ x: 'stretch', y: 'min' });
    expect(nodes.attributes?.constrain).toEqual({ x: 'stretch', y: 'stretch' });
    expect(nodes.methods?.constrain).toEqual({ x: 'stretch', y: 'max' });
  });

  test('the compartments tile the class exactly, so their shared edges are its two rules', () => {
    const result = compileTemplate(ClassNode.spec.template!, COMPOSITE);
    if (!isCompiled(result)) {
      throw new Error('the template does not compile');
    }
    const span = (id: string) => {
      const node = result.composite.nodes[id]!;
      return [node.center.y - node.size.height / 2, node.center.y + node.size.height / 2];
    };
    const [nameTop, nameBottom] = span('name');
    const [attributesTop, attributesBottom] = span('attributes');
    const [methodsTop, methodsBottom] = span('methods');
    expect(nameBottom).toEqual(attributesTop);
    expect(attributesBottom).toEqual(methodsTop);
    expect(methodsBottom - nameTop).toEqual(SIZE.height);
  });

  test('a new class places that composite and keeps its own fields typed', () => {
    const registry = createNodeRegistry(
      { ...defaultNodeTypes, [ClassNode.TYPE]: kindNodeDef(ClassNode.TYPE, ClassNode.spec) },
      defaultNodePrototypes,
    );
    const node = registry[ClassNode.TYPE]!.create({
      id: 'n1',
      z: 'a0',
      center: { x: 0, y: 0 },
      size: { width: 192, height: 144 },
    });
    expect(node.type).toEqual(ClassNode.TYPE);
    expect(isInstanceNode(node)).toBe(true);
    expect(Reflect.get(node, 'composite')).toEqual(COMPOSITE);
    expect(Reflect.get(node, 'attributes')).toEqual(['id: string']);
    expect(Reflect.get(node, 'methods')).toEqual(['save(): void']);
  });
});
