//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { isInstanceNode } from '@dxos/scene';

import { defaultNodePrototypes, defaultNodeTypes } from '../components/index.ts';
import { createNodeRegistry, templateCompositeId } from '../model/index.ts';
import { nodeBounds } from '../utils/index.ts';
import { compileTemplate, isCompiled, templateComposite } from './template.ts';

/** A card as a tool would ship it: a frame, a glyph pinned to the corner, a body that grows, a footer on the floor. */
const CARD = `composite tile size=288x192 name="Card" {
  element frame rect @ 0,0 size=288x192 constrain=stretch rounded=true
  element icon icon @ -114,-66 size=36x36 constrain=min
  element title note "Card" @ -24,-66 size=204x24 constrain=stretch,min
  element body note "Body" @ 0,6 size=264x84 constrain=stretch
  element footer note "Footer" @ 0,75 size=264x18 constrain=stretch,max
}
`;

describe('compileTemplate', () => {
  test('a template is the composite its source declares, under the id the tool stores it as', () => {
    const result = compileTemplate(CARD, 'template:card');
    expect(isCompiled(result)).toBe(true);
    if (!isCompiled(result)) {
      return;
    }
    expect(result.composite.id).toEqual('template:card');
    expect(result.composite.kind).toEqual('composite');
    expect(Object.keys(result.composite.nodes).sort()).toEqual(['body', 'footer', 'frame', 'icon', 'title']);
  });

  test("the parts carry the constraints the source gave them, so the composite is the editor's to resize", () => {
    const result = compileTemplate(CARD, 'c');
    expect(isCompiled(result) && result.composite.nodes.footer?.constrain).toEqual({ x: 'stretch', y: 'max' });
    expect(isCompiled(result) && result.composite.nodes.icon?.constrain).toEqual({ x: 'min', y: 'min' });
    expect(isCompiled(result) && result.composite.nodes.frame?.constrain).toEqual({ x: 'stretch', y: 'stretch' });
  });

  test('a part keeps the geometry the source placed it at', () => {
    const result = compileTemplate(CARD, 'c');
    const icon = isCompiled(result) ? result.composite.nodes.icon : undefined;
    expect(icon && nodeBounds(icon)).toEqual({ x: -132, y: -84, width: 36, height: 36 });
  });

  test('source that does not parse is reported rather than drawn', () => {
    const result = compileTemplate('composite c { element a rect @ 0,0 size=10x10 constrain=sideways }', 'c');
    expect(isCompiled(result)).toBe(false);
    expect(!isCompiled(result) && result.problems[0]).toContain('constrain takes');
  });

  test('source with no composite is reported', () => {
    const result = compileTemplate('layout l dim=2d { element a rect @ 0,0 size=10x10 }', 'c');
    expect(!isCompiled(result) && result.problems[0]).toContain('one composite');
  });
});

describe('a template type in the registry', () => {
  const registry = createNodeRegistry(
    { ...defaultNodeTypes, tile: { extends: 'object', name: 'Tile', icon: 'ph--cards--regular', template: CARD } },
    defaultNodePrototypes,
  );

  test('places an instance of the tool’s own composite, with no create of its own', () => {
    const node = registry.tile!.create({
      id: 'n1',
      z: 'a0',
      center: { x: 0, y: 0 },
      size: { width: 288, height: 192 },
    });
    expect(isInstanceNode(node)).toBe(true);
    expect(isInstanceNode(node) && node.composite).toEqual(templateCompositeId('tile'));
  });

  test('two shapes of the same tool are instances of one definition', () => {
    const props = { z: 'a0', center: { x: 0, y: 0 }, size: { width: 288, height: 192 } };
    const first = registry.tile!.create({ ...props, id: 'n1' });
    const second = registry.tile!.create({ ...props, id: 'n2' });
    expect(isInstanceNode(first) && isInstanceNode(second) && first.composite === second.composite).toBe(true);
  });

  test('the composite the instances draw is compiled from the type’s template', () => {
    const composite = templateComposite(registry, templateCompositeId('tile'));
    expect(composite?.id).toEqual(templateCompositeId('tile'));
    expect(Object.keys(composite?.nodes ?? {})).toHaveLength(5);
  });

  test('a type with no template has no composite to compile', () => {
    expect(templateComposite(registry, templateCompositeId('rect'))).toBeUndefined();
    expect(templateComposite(registry, 'not-a-template')).toBeUndefined();
  });
});
