//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type CapabilityManager } from '../../../core';
import { isSurfaceAvailable } from './SurfaceComponent';
import { type RoleToken, type SurfaceFilter, create, isSurfaceFilter, makeType } from './types';

describe('Surface.makeType', () => {
  test('creates a role token carrying the role string', ({ expect }) => {
    const token = makeType<{ subject: string }>('test-role');
    expect(token.role).toBe('test-role');
  });

  test('tokens with the same role are independent objects (identity-by-role)', ({ expect }) => {
    const a = makeType<{ x: number }>('shared');
    const b = makeType<{ x: number }>('shared');
    expect(a).not.toBe(b);
    expect(a.role).toBe(b.role);
  });
});

describe('isSurfaceFilter', () => {
  test('distinguishes filter objects from predicate functions', ({ expect }) => {
    const filter: SurfaceFilter<Record<string, any>> = { bindings: [{ role: 'r', guard: () => true }] };
    expect(isSurfaceFilter(filter)).toBe(true);
    expect(isSurfaceFilter(() => true)).toBe(false);
    expect(isSurfaceFilter({})).toBe(false);
    expect(isSurfaceFilter(null)).toBe(false);
  });
});

describe('create', () => {
  test('accepts the legacy { role, filter } shape', ({ expect }) => {
    const def = create({
      id: 'legacy',
      role: 'article',
      filter: (data): data is { x: number } => typeof (data as any).x === 'number',
      component: () => null,
    });
    expect(def.kind).toBe('react');
    expect(def.role).toBe('article');
    expect(def.filter!({ x: 1 })).toBe(true);
    expect(def.filter!({})).toBe(false);
  });

  test('expands a single-binding SurfaceFilter into a role string', ({ expect }) => {
    const filter: SurfaceFilter<Record<string, any>> = {
      bindings: [{ role: 'article', guard: (d) => (d as any).subject === 'ok' }],
    };
    const def = create({ id: 'typed-single', filter, component: () => null });
    expect(def.role).toBe('article');
    expect(def.filter!({ subject: 'ok' }, 'article')).toBe(true);
    expect(def.filter!({ subject: 'no' }, 'article')).toBe(false);
  });

  test('expands a multi-binding SurfaceFilter into a role array with role-scoped guards', ({ expect }) => {
    const filter: SurfaceFilter<Record<string, any>> = {
      bindings: [
        { role: 'article', guard: (d) => (d as any).subject === 'a' },
        { role: 'section', guard: (d) => (d as any).subject === 's' },
      ],
    };
    const def = create({ id: 'typed-multi', filter, component: () => null });
    expect(def.role).toEqual(['article', 'section']);
    // Role-specific guard.
    expect(def.filter!({ subject: 'a' }, 'article')).toBe(true);
    expect(def.filter!({ subject: 'a' }, 'section')).toBe(false);
    expect(def.filter!({ subject: 's' }, 'section')).toBe(true);
    expect(def.filter!({ subject: 's' }, 'article')).toBe(false);
    // Without role, any binding may match.
    expect(def.filter!({ subject: 'a' })).toBe(true);
    expect(def.filter!({ subject: 'unknown' })).toBe(false);
  });

  test('passes position through untouched', ({ expect }) => {
    const filter: SurfaceFilter<Record<string, any>> = { bindings: [{ role: 'r', guard: () => true }] };
    const def = create({ id: 'pos', filter, component: () => null, position: 'fallback' });
    expect(def.position).toBe('fallback');
  });
});

describe('role token typing', () => {
  test('makeType preserves TData through token use-sites', ({ expect }) => {
    // Type-level smoke test: if TS compiles, we're fine. The `RoleToken<T>`
    // phantom should not impose a runtime constraint.
    const token: RoleToken<{ subject: number }> = makeType('numeric');
    expect(token.role).toBe('numeric');
  });
});

describe('isSurfaceAvailable typing', () => {
  // These tests double as static assertions: the `@ts-expect-error` comments
  // fail to compile if the surrounding expression typechecks, so they verify
  // the typed overload narrows `data` to the token's declared contract.
  const sectionToken = makeType<{ attendableId: string; subject: string }>('section');
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

  test('legacy overload accepts loose data when `role` is a string', () => {
    // No error — legacy overload's `data` is untyped (`Record<string, unknown>`).
    isSurfaceAvailable(capabilityManager, {
      role: 'article',
      data: { anything: 'goes' },
    });
  });
});
