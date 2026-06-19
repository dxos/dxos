//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type CapabilityManager } from '../../../core';
import { isSurfaceAvailable } from './SurfaceComponent';
import { type RoleToken, type SurfaceFilter, create, isSurfaceFilter, makeFilter, makeType } from './types';

describe('Surface.makeType', () => {
  test('creates a role token with the given NSID', ({ expect }) => {
    const token = makeType<{ subject: string }>('org.dxos.test.role.testRole');
    expect(token.role).toBe('org.dxos.test.role.testRole');
  });

  test('tokens with the same role are independent objects (identity-by-role)', ({ expect }) => {
    const tokenOne = makeType<{ x: number }>('org.dxos.test.role.shared');
    const tokenTwo = makeType<{ x: number }>('org.dxos.test.role.shared');
    expect(tokenOne).not.toBe(tokenTwo);
    expect(tokenOne.role).toBe(tokenTwo.role);
  });

  test('throws on invalid NSID at runtime (hyphenated final segment)', ({ expect }) => {
    expect(() => makeType('org.dxos.test.role.bad-name' as any)).toThrow();
  });

  test('throws on single-segment NSID', ({ expect }) => {
    expect(() => makeType('article' as any)).toThrow();
  });
});

describe('isSurfaceFilter', () => {
  test('distinguishes filter objects from predicate functions', ({ expect }) => {
    const filter: SurfaceFilter<Record<string, any>> = {
      bindings: [{ role: 'org.dxos.test.role.r', guard: () => true }],
    };
    expect(isSurfaceFilter(filter)).toBe(true);
    expect(isSurfaceFilter(() => true)).toBe(false);
    expect(isSurfaceFilter({})).toBe(false);
    expect(isSurfaceFilter(null)).toBe(false);
  });
});

describe('create', () => {
  test('expands a single-binding SurfaceFilter into a role string', ({ expect }) => {
    const token = makeType<Record<string, any>>('org.dxos.test.role.article');
    const filter = makeFilter(token, (data) => data.subject === 'ok');
    const def = create({ id: 'typedSingle', filter, component: () => null });
    expect(def.role).toBe('org.dxos.test.role.article');
    expect(def.filter!({ subject: 'ok' }, 'org.dxos.test.role.article')).toBe(true);
    expect(def.filter!({ subject: 'no' }, 'org.dxos.test.role.article')).toBe(false);
  });

  test('expands a multi-binding SurfaceFilter into a role array with role-scoped guards', ({ expect }) => {
    const tokenA = makeType<Record<string, any>>('org.dxos.test.role.article');
    const tokenB = makeType<Record<string, any>>('org.dxos.test.role.section');
    const filter: SurfaceFilter<Record<string, any>> = {
      bindings: [
        { role: tokenA.role, guard: (data) => (data as any).subject === 'a' },
        { role: tokenB.role, guard: (data) => (data as any).subject === 's' },
      ],
    };
    const def = create({ id: 'typedMulti', filter, component: () => null });
    expect(def.role).toEqual([tokenA.role, tokenB.role]);
    // Role-specific guard.
    expect(def.filter!({ subject: 'a' }, tokenA.role)).toBe(true);
    expect(def.filter!({ subject: 'a' }, tokenB.role)).toBe(false);
    expect(def.filter!({ subject: 's' }, tokenB.role)).toBe(true);
    expect(def.filter!({ subject: 's' }, tokenA.role)).toBe(false);
    // Without role, any binding may match.
    expect(def.filter!({ subject: 'a' })).toBe(true);
    expect(def.filter!({ subject: 'unknown' })).toBe(false);
  });

  test('passes position through untouched', ({ expect }) => {
    const token = makeType<Record<string, any>>('org.dxos.test.role.r');
    const filter: SurfaceFilter<Record<string, any>> = { bindings: [{ role: token.role, guard: () => true }] };
    const def = create({ id: 'pos', filter, component: () => null, position: 'last' });
    expect(def.position).toBe('last');
  });
});

describe('role token typing', () => {
  test('makeType preserves TData through token use-sites', ({ expect }) => {
    // Type-level smoke test: if TS compiles, we're fine.
    const token: RoleToken<{ subject: number }> = makeType('org.dxos.test.role.numeric');
    expect(token.role).toBe('org.dxos.test.role.numeric');
  });
});

describe('isSurfaceAvailable typing', () => {
  // These tests double as static assertions: the `@ts-expect-error` comments
  // fail to compile if the surrounding expression typechecks, so they verify
  // the typed overload narrows `data` to the token's declared contract.
  const sectionToken = makeType<{ attendableId: string; subject: string }>('org.dxos.test.role.section');
  const capabilityManager = { getAll: () => [] } as unknown as CapabilityManager.CapabilityManager;

  test('typed overload accepts data matching the token contract', () => {
    // No error — data has all required fields.
    isSurfaceAvailable(capabilityManager, {
      type: sectionToken,
      data: { attendableId: 'id', subject: 'x' },
    });
  });

  test('typed overload rejects data missing required fields', () => {
    // @ts-expect-error — `data` is missing `attendableId` required by the token.
    isSurfaceAvailable(capabilityManager, { type: sectionToken, data: { subject: 'x' } });
  });

  test('typed overload rejects data with wrong field type', () => {
    // @ts-expect-error — `attendableId` must be a string, not a number.
    isSurfaceAvailable(capabilityManager, { type: sectionToken, data: { attendableId: 123, subject: 'x' } });
  });
});
