//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { isIntent } from './intent.ts';

describe('isIntent', () => {
  test('accepts well-formed intents, batches included', ({ expect }) => {
    expect(isIntent({ kind: 'move', ids: ['a'], delta: { x: 1, y: 2 } })).toBe(true);
    expect(
      isIntent({
        kind: 'create',
        node: { id: 'a', type: 'rect', z: 'a0', center: { x: 0, y: 0 }, size: { width: 16, height: 16 } },
      }),
    ).toBe(true);
    expect(isIntent({ kind: 'layout' })).toBe(true);
    expect(isIntent({ kind: 'timeline', timeline: undefined })).toBe(true);
    expect(
      isIntent({
        kind: 'batch',
        intents: [
          { kind: 'delete', ids: ['a'] },
          { kind: 'update', id: 'b', values: { label: 'B', locked: undefined } },
        ],
      }),
    ).toBe(true);
  });

  test('refuses unknown kinds, missing fields, and a malformed intent inside a batch', ({ expect }) => {
    expect(isIntent(undefined)).toBe(false);
    expect(isIntent({ kind: 'teleport', ids: ['a'] })).toBe(false);
    expect(isIntent({ kind: 'move', ids: ['a'] })).toBe(false);
    expect(isIntent({ kind: 'delete', ids: 'a' })).toBe(false);
    expect(isIntent({ kind: 'create', node: { id: 'a' } })).toBe(false);
    expect(isIntent({ kind: 'update', id: 'a', values: { center: 'abc' } })).toBe(false);
    expect(isIntent({ kind: 'update', id: 'a', values: { type: 'ellipse' } })).toBe(false);
    expect(isIntent({ kind: 'update', id: 'a', values: { center: undefined } })).toBe(false);
    // An own `__proto__` key, as JSON.parse makes, is just an unknown field.
    expect(isIntent({ kind: 'update', id: 'a', values: JSON.parse('{"__proto__":null}') })).toBe(true);
    expect(isIntent({ kind: 'batch', intents: [{ kind: 'delete', ids: ['a'] }, { kind: 'move' }] })).toBe(false);
  });
});
