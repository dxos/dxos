//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Role } from '@dxos/app-framework';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { Cell } from './Cell';

describe('Cell', () => {
  const object = { id: 'obj-1' } as any;

  test('article binds the object with no explicit token', () => {
    const cell = Cell.article(object);
    expect(cell).toMatchObject({ object });
    expect(cell.token).toBeUndefined();
  });

  test('article variant flows into surface data', () => {
    const cell = Cell.article(object, { variant: 'compact' });
    expect(cell.data).toMatchObject({ variant: 'compact' });
  });

  test('companion sets subject + companionTo', () => {
    const cell = Cell.companion(object, 'history');
    expect(cell).toMatchObject({ object, data: { subject: 'history', companionTo: object } });
  });

  test('deckCompanion builds the variant token', () => {
    const cell = Cell.deckCompanion('trace');
    expect(cell.type.role).toBe(AppSurface.deckCompanion('trace').role);
  });

  test('surface passes a raw role token + data', () => {
    const Token = Role.make<Record<string, any>>('org.dxos.test.logging');
    expect(Cell.surface(Token, { foo: 1 })).toMatchObject({ type: Token, data: { foo: 1 } });
  });
});
