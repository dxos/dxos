//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as Routine from '@dxos/compute/Routine';
import * as Runnable from '@dxos/compute/Runnable';
import * as Trigger from '@dxos/compute/Trigger';
import { Obj, Ref } from '@dxos/echo';

import { blank } from '../templates';
import { isRunInstructions, runInstructionsRef } from './run-instructions';
import { makeRoutine } from './wire';

describe('wire', () => {
  test('makeRoutine produces a typed Routine', ({ expect }) => {
    const routine = makeRoutine({ name: 'Test', triggers: [] });
    expect(Routine.instanceOf(routine)).toBe(true);
    expect(Obj.instanceOf(Routine.Routine, routine)).toBe(true);
    expect(Obj.getLabel(routine)).toBe('Test');
    expect(routine.triggers).toEqual([]);
    expect(routine.spec).toBeUndefined();
  });

  test('Runnable seam is currently the Operation type', ({ expect }) => {
    // MVP: Runnable === Operation. Widening this to a union is the documented next step.
    expect(Runnable.Runnable).toBe(Operation.PersistentOperation);
  });

  test('makeRoutine wires an instructions action so a single add yields a runnable routine', ({ expect }) => {
    const instructions = Instructions.make({ name: 'Body', text: 'do something' });
    const trigger = Trigger.make({ spec: Trigger.specTimer('0 9 * * *') });
    const routine = makeRoutine({ name: 'R', instructions, trigger });

    // The routine owns the instructions, and the trigger dispatches RunInstructions with those instructions
    // bound into the trigger input so no separate persistence step is needed.
    expect(Routine.instructionsRef(routine)?.target?.id).toBe(instructions.id);
    expect(routine.triggers[0]?.target?.id).toBe(trigger.id);
    expect(isRunInstructions(trigger.runnable)).toBe(true);
    const bound = trigger.input?.instructions;
    expect(Ref.isRef(bound) ? bound.target?.id : undefined).toBe(instructions.id);
    // A trigger with no explicit `remote` flag runs locally.
    expect(trigger.remote).toBeUndefined();
  });

  test('makeRoutine preserves an explicit trigger remote override', ({ expect }) => {
    const trigger = Trigger.make({ remote: true });
    const routine = makeRoutine({ name: 'R', trigger });
    expect(routine.triggers[0]?.target?.remote).toBe(true);
  });

  test('makeRoutine wires triggers supplied via the `triggers` array', ({ expect }) => {
    const instructions = Instructions.make({ name: 'Body', text: 'do something' });
    const trigger = Trigger.make({ spec: Trigger.specTimer('0 9 * * *') });
    const routine = makeRoutine({ name: 'R', instructions, triggers: [Ref.make(trigger)] });
    expect(isRunInstructions(trigger.runnable)).toBe(true);
    const bound = trigger.input?.instructions;
    expect(Ref.isRef(bound) ? bound.target?.id : undefined).toBe(instructions.id);
  });

  test('makeRoutine leaves pre-set trigger bindings alone when there is no action', ({ expect }) => {
    const trigger = Trigger.make({});
    const preset = runInstructionsRef();
    Obj.update(trigger, (trigger) => {
      trigger.runnable = preset;
    });
    makeRoutine({ name: 'R', trigger });
    expect(trigger.runnable?.uri).toBe(preset.uri);
  });

  describe('blank template', () => {
    test('is the default no-op template', ({ expect }) => {
      expect(blank.id).toBe('org.dxos.routine.blank');
      expect(blank.label).toBe('Blank');
      expect(typeof blank.scaffold).toBe('function');
    });
  });
});
