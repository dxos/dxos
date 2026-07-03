//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Instructions, Operation, Runnable, Trigger } from '@dxos/compute';
import { Obj, Ref, Type } from '@dxos/echo';

import { blank } from '../templates';
import { isRunInstructions } from '../util';
import * as Routine from './Routine';

describe('Routine', () => {
  test('make produces a typed Routine', ({ expect }) => {
    const routine = Routine.make({ name: 'Test', triggers: [] });
    expect(Routine.instanceOf(routine)).toBe(true);
    expect(Obj.instanceOf(Routine.Routine, routine)).toBe(true);
    expect(Type.getTypename(Routine.Routine)).toBe('org.dxos.type.routine');
    expect(Obj.getLabel(routine)).toBe('Test');
    expect(routine.triggers).toEqual([]);
    expect(routine.spec).toBeUndefined();
  });

  test('Runnable seam is currently the Operation type', ({ expect }) => {
    // MVP: Runnable === Operation. Widening this to a union is the documented next step.
    expect(Runnable.Runnable).toBe(Operation.PersistentOperation);
  });

  test('make wires an instructions action so a single add yields a runnable routine', ({ expect }) => {
    const instructions = Instructions.make({ name: 'Body', text: 'do something' });
    const trigger = Trigger.make({ spec: Trigger.specTimer('0 9 * * *') });
    const routine = Routine.make({ name: 'R', instructions, trigger });

    // The routine owns the instructions, and the trigger dispatches RunInstructions with those instructions
    // bound into the trigger input so no separate persistence step is needed.
    expect(Routine.instructionsRef(routine)?.target?.id).toBe(instructions.id);
    expect(routine.triggers[0]?.target?.id).toBe(trigger.id);
    expect(isRunInstructions(trigger.runnable)).toBe(true);
    const bound = trigger.input?.instructions;
    expect(Ref.isRef(bound) ? bound.target?.id : undefined).toBe(instructions.id);
    expect(trigger.computeEnvironment).toBe('local');
  });

  test('make preserves an explicit trigger computeEnvironment override', ({ expect }) => {
    const trigger = Trigger.make({ computeEnvironment: 'edge' });
    const routine = Routine.make({ name: 'R', trigger });

    expect(routine.triggers[0]?.target?.computeEnvironment).toBe('edge');
  });

  describe('blank template', () => {
    test('is the default no-op template', ({ expect }) => {
      expect(blank.id).toBe('org.dxos.routine.blank');
      expect(blank.label).toBe('Blank');
      expect(typeof blank.scaffold).toBe('function');
    });
  });
});
