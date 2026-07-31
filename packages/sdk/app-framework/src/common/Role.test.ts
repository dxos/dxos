//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Role from './Role';

describe('Role.make', () => {
  test('creates a role token with the given NSID', ({ expect }) => {
    const token = Role.make<{ subject: string }>('org.dxos.test.role.testRole');
    expect(token.role).toBe('org.dxos.test.role.testRole');
  });

  test('tokens with the same role are independent objects (identity-by-role)', ({ expect }) => {
    const tokenOne = Role.make<{ x: number }>('org.dxos.test.role.shared');
    const tokenTwo = Role.make<{ x: number }>('org.dxos.test.role.shared');
    expect(tokenOne).not.toBe(tokenTwo);
    expect(tokenOne.role).toBe(tokenTwo.role);
  });

  test('throws on invalid NSID at runtime (hyphenated final segment)', ({ expect }) => {
    expect(() => Role.make('org.dxos.test.role.bad-name' as any)).toThrow();
  });

  test('throws on single-segment NSID', ({ expect }) => {
    expect(() => Role.make('article' as any)).toThrow();
  });

  test('throws on two-segment NSID (below the three-segment minimum)', ({ expect }) => {
    expect(() => Role.make('org.article' as any)).toThrow();
  });
});

describe('role token typing', () => {
  test('make preserves TData through token use-sites', ({ expect }) => {
    // Type-level smoke test: if TS compiles, we're fine.
    const token: Role.Role<{ subject: number }> = Role.make('org.dxos.test.role.numeric');
    expect(token.role).toBe('org.dxos.test.role.numeric');
  });
});
