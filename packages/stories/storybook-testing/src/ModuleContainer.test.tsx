//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Role } from '@dxos/app-framework';

import { normalizeCell } from './ModuleContainer';

describe('normalizeCell', () => {
  const Token = Role.make<Record<string, any>>('org.dxos.test.token');

  test('role token → surface cell', () => {
    expect(normalizeCell(Token, 'space-1')).toMatchObject({ kind: 'surface', type: Token });
  });

  test('object cell derives collections attendableId', () => {
    const object = { id: 'obj-1' } as any;
    const cell = normalizeCell({ object }, 'space-1');
    if (cell.kind !== 'object') {
      throw new Error('expected an object cell');
    }
    expect(cell.attendableId).toContain('space-1');
    expect(cell.attendableId).toContain('obj-1');
  });

  test('object cell honors an explicit id override', () => {
    const object = { id: 'obj-1' } as any;
    const cell = normalizeCell({ object, id: 'custom' }, 'space-1');
    expect(cell.id).toBe('custom');
  });
});
