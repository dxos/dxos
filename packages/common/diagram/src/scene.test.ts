//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Shape } from '@dxos/scene';

describe('scene refs', () => {
  test('parses every ref form', ({ expect }) => {
    expect(Shape.parseRef('box')).toEqual({ element: 'box' });
    expect(Shape.parseRef('face/box')).toEqual({ object: 'face', element: 'box' });
    expect(Shape.parseRef('box#east')).toEqual({ element: 'box', port: 'east' });
    expect(Shape.parseRef('face/box#east')).toEqual({ object: 'face', element: 'box', port: 'east' });
  });

  test('Shape.formatRef inverts Shape.parseRef', ({ expect }) => {
    for (const ref of ['box', 'face/box', 'box#east', 'face/box#east']) {
      expect(Shape.formatRef(Shape.parseRef(ref))).toBe(ref);
    }
  });

  test('Shape.resolveRef yields the object/element handle without the port', ({ expect }) => {
    expect(Shape.resolveRef('box', 'face')).toBe('face/box');
    expect(Shape.resolveRef('box#east', 'face')).toBe('face/box');
    expect(Shape.resolveRef('hat/brim#south', 'face')).toBe('hat/brim');
  });
});

describe('scene elements', () => {
  test('accepts a portal', ({ expect }) => {
    const portal = { kind: 'portal', id: 'child', x: 0, y: 0, w: 128, h: 96, ref: 'dxn:echo:@:abc', text: 'Child' };
    expect(Schema.decodeUnknownSync(Shape.Element)(portal)).toEqual(portal);
  });
});
