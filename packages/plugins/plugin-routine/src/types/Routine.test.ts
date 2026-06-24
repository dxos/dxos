//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Operation, Runnable } from '@dxos/compute';
import { Obj, Type } from '@dxos/echo';

import { blank } from '../templates';
import * as Routine from './Routine';

describe('Routine', () => {
  test('make produces a typed Routine', ({ expect }) => {
    const routine = Routine.make({ name: 'Test', triggers: [] });
    expect(Routine.instanceOf(routine)).toBe(true);
    expect(Obj.instanceOf(Routine.Routine, routine)).toBe(true);
    expect(Type.getTypename(Routine.Routine)).toBe('org.dxos.type.routine');
    expect(Obj.getLabel(routine)).toBe('Test');
    expect(routine.triggers).toEqual([]);
    expect(routine.runnable).toBeUndefined();
  });

  test('Runnable seam is currently the Operation type', ({ expect }) => {
    // MVP: Runnable === Operation. Widening this to a union is the documented next step.
    expect(Runnable.Runnable).toBe(Operation.PersistentOperation);
  });

  describe('blank template', () => {
    test('is the default no-op template', ({ expect }) => {
      expect(blank.id).toBe('org.dxos.routine.blank');
      expect(blank.label).toBe('Blank');
      expect(typeof blank.scaffold).toBe('function');
    });
  });
});
