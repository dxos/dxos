//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Position } from '@dxos/util';

import * as Role from '../../../common/Role';
import { type CapabilityManager } from '../../../core';
import { isSurfaceAvailable } from './SurfaceComponent';
import { type Filter, create, isFilter, makeFilter } from './types';

describe('isFilter', () => {
  test('distinguishes filter objects from predicate functions', ({ expect }) => {
    const filter: Filter<Record<string, any>> = {
      bindings: [{ role: 'org.dxos.test.role.r', guard: () => true }],
    };
    expect(isFilter(filter)).toBe(true);
    expect(isFilter(() => true)).toBe(false);
    expect(isFilter({})).toBe(false);
    expect(isFilter(null)).toBe(false);
  });
});

describe('create', () => {
  test('expands a single-binding filter into a role string', ({ expect }) => {
    const token = Role.make<Record<string, any>>('org.dxos.test.role.article');
    const filter = makeFilter(token, (data) => data.subject === 'ok');
    const def = create({ id: 'typedSingle', filter, component: () => null });
    expect(def.role).toBe('org.dxos.test.role.article');
    expect(def.filter!({ subject: 'ok' }, 'org.dxos.test.role.article')).toBe(true);
    expect(def.filter!({ subject: 'no' }, 'org.dxos.test.role.article')).toBe(false);
  });

  test('expands a multi-binding filter into a role array with role-scoped guards', ({ expect }) => {
    const tokenA = Role.make<Record<string, any>>('org.dxos.test.role.article');
    const tokenB = Role.make<Record<string, any>>('org.dxos.test.role.section');
    const filter: Filter<Record<string, any>> = {
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
    const token = Role.make<Record<string, any>>('org.dxos.test.role.r');
    const filter: Filter<Record<string, any>> = { bindings: [{ role: token.role, guard: () => true }] };
    const def = create({ id: 'pos', filter, component: () => null, position: Position.last });
    expect(def.position).toBe(Position.last);
  });
});

describe('isSurfaceAvailable typing', () => {
  // These tests double as static assertions: the `@ts-expect-error` comments
  // fail to compile if the surrounding expression typechecks, so they verify
  // the typed overload narrows `data` to the token's declared contract.
  const sectionToken = Role.make<{ attendableId: string; subject: string }>('org.dxos.test.role.section');
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
