//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Instructions from '@dxos/compute/Instructions';
import * as Routine from '@dxos/compute/Routine';
import * as Trigger from '@dxos/compute/Trigger';
import { DXN, Ref } from '@dxos/echo';

import { switchActionKind } from './action.ts';
import { isRunInstructions } from './run-instructions.ts';
import { makeRoutine } from './wire.ts';

describe('switchActionKind', () => {
  test('a round trip through instructions restores the operation and its trigger binding', ({ expect }) => {
    // Shaped like a connector's sync routine: the operation is a registry key, not a persisted object.
    const operation = Ref.fromURI(DXN.make('org.example.operation.sync'));
    const trigger = Trigger.make({ enabled: true, spec: Trigger.specTimer('*/10 * * * *') });
    const routine = makeRoutine({ name: 'Sync', spec: { kind: 'runnable', runnable: operation }, trigger });
    expect(trigger.runnable?.uri).toBe(operation.uri);

    switchActionKind(routine, 'instructions');
    expect(isRunInstructions(trigger.runnable)).toBe(true);

    switchActionKind(routine, 'runnable');
    expect(Routine.runnableRef(routine)?.uri).toBe(operation.uri);
    expect(trigger.runnable?.uri).toBe(operation.uri);
  });

  test('a round trip through an operation restores the authored instructions', ({ expect }) => {
    const instructions = Instructions.make({ name: 'Body', text: 'do something' });
    const trigger = Trigger.make({ spec: Trigger.specTimer('0 9 * * *') });
    const routine = makeRoutine({ name: 'R', instructions, trigger });

    // No operation was ever picked, so none is restored.
    switchActionKind(routine, 'runnable');
    expect(routine.spec).toBeUndefined();

    switchActionKind(routine, 'instructions');
    expect(Routine.instructionsRef(routine)?.target?.id).toBe(instructions.id);
    expect(isRunInstructions(trigger.runnable)).toBe(true);
  });
});
