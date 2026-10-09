//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Element, formatRef, parseRef, resolveRef } from './scene.ts';

describe('scene refs', () => {
  test('parses every ref form', ({ expect }) => {
    expect(parseRef('box')).toEqual({ element: 'box' });
    expect(parseRef('face/box')).toEqual({ object: 'face', element: 'box' });
    expect(parseRef('box#east')).toEqual({ element: 'box', port: 'east' });
    expect(parseRef('face/box#east')).toEqual({ object: 'face', element: 'box', port: 'east' });
  });

  test('formatRef inverts parseRef', ({ expect }) => {
    for (const ref of ['box', 'face/box', 'box#east', 'face/box#east']) {
      expect(formatRef(parseRef(ref))).toBe(ref);
    }
  });

  test('resolveRef yields the object/element handle without the port', ({ expect }) => {
    expect(resolveRef('box', 'face')).toBe('face/box');
    expect(resolveRef('box#east', 'face')).toBe('face/box');
    expect(resolveRef('hat/brim#south', 'face')).toBe('hat/brim');
  });
});

describe('scene elements', () => {
  test('accepts a portal', ({ expect }) => {
    const portal = { kind: 'portal', id: 'child', x: 0, y: 0, w: 128, h: 96, ref: 'dxn:echo:@:abc', text: 'Child' };
    expect(Schema.decodeUnknownSync(Element)(portal)).toEqual(portal);
  });
});
