//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj, Type } from '@dxos/echo';

import * as Routine from './Routine.ts';

describe('Routine', () => {
  test('typename and factory', ({ expect }) => {
    expect(Type.getTypename(Routine.Routine)).toBe('org.dxos.type.routine');
    const routine = Routine.make({ name: 'test' });
    expect(Obj.instanceOf(Routine.Routine, routine)).toBe(true);
    expect(routine.triggers).toEqual([]);
  });
});
