//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import {
  CloudNode,
  EllipseNode,
  HullNode,
  NodeStyle,
  NoteNode,
  PolygonNode,
  PolylineNode,
  RectNode,
  ShapeNode,
  boxFields,
  linkBase,
  nodeBase,
  nodePadding,
} from './element.ts';

describe('element base', () => {
  test('the scene element base has every react-ui-canvas node and link field', () => {
    expect(Object.keys(nodeBase).sort()).toEqual(
      [
        'bind',
        'center',
        'class',
        'composite',
        'constrain',
        'exposed',
        'follows',
        'grow',
        'hidden',
        'id',
        'layer',
        'locked',
        'optional',
        'overrides',
        'parent',
        'ports',
        'portsPerSide',
        'rotation',
        'size',
        'style',
        'z',
      ].sort(),
    );
    expect(Object.keys(linkBase).sort()).toEqual(
      [
        'class',
        'connector',
        'constrain',
        'ends',
        'id',
        'layer',
        'locked',
        'source',
        'style',
        'target',
        'text',
        'z',
      ].sort(),
    );
    expect(Object.keys(boxFields)).toEqual(['label']);
  });

  test('a node type is the base plus its own fields', () => {
    // A rectangle draws a label in a box, so it carries the padding between the two as well as the box's own fields.
    expect(Object.keys(RectNode.fields).sort()).toEqual(['type', ...Object.keys(nodeBase), 'label', 'padding'].sort());
    expect(Object.keys(NodeStyle.fields)).toContain('hue');
  });

  test('padding is on the types that draw text in a box, and reads back off a node', () => {
    for (const fields of [RectNode.fields, NoteNode.fields]) {
      expect(Object.keys(fields)).toContain('padding');
    }
    const node: NoteNode = {
      type: 'note',
      id: 'a',
      z: 'a0',
      center: { x: 0, y: 0 },
      size: { width: 1, height: 1 },
      text: '',
    };
    expect(nodePadding(node)).toBeUndefined();
    // Zero is a padding, not an absent one: a card's region starts on its own edge.
    const none: NoteNode = { ...node, padding: { x: 0, y: 0 } };
    expect(nodePadding(none)).toEqual({ x: 0, y: 0 });
    const across: NoteNode = { ...node, padding: { x: 8 } };
    expect(nodePadding(across)).toEqual({ x: 8 });
  });

  test('every shape that draws a label carries padding, in scene px', () => {
    const frame = { id: 'a', z: 'a0', center: { x: 0, y: 0 }, size: { width: 96, height: 48 } };
    const padded = { ...frame, label: 'A', padding: { x: 24, y: 12 } };
    expect(Schema.is(RectNode)({ ...padded, type: 'rect' })).toBe(true);
    expect(Schema.is(EllipseNode)({ ...padded, type: 'ellipse' })).toBe(true);
    expect(Schema.is(CloudNode)({ ...padded, type: 'cloud' })).toBe(true);
    expect(Schema.is(PolygonNode)({ ...padded, type: 'polygon' })).toBe(true);
    expect(Schema.is(ShapeNode)({ ...padded, type: 'shape', recipe: 'arrow' })).toBe(true);
    expect(Schema.is(PolylineNode)({ ...padded, type: 'polyline', points: [] })).toBe(true);
    // A hull's name is a label too.
    expect(Schema.is(HullNode)({ ...padded, type: 'hull' })).toBe(true);
    // One side alone may be set; the other then keeps its default.
    const across: EllipseNode = { ...padded, type: 'ellipse', padding: { x: 6 } };
    expect(nodePadding(across)).toEqual({ x: 6 });
    expect(Schema.is(EllipseNode)({ ...padded, type: 'ellipse', padding: { x: 'wide' } })).toBe(false);
  });
});
