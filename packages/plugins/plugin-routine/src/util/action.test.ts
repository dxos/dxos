//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Instructions from '@dxos/compute/Instructions';
import * as Routine from '@dxos/compute/Routine';
import * as Trigger from '@dxos/compute/Trigger';
import { DXN, Ref } from '@dxos/echo';

import { type ActionStash, switchActionKind } from './action.ts';
import { isRunInstructions } from './run-instructions.ts';
import { makeRoutine } from './wire.ts';

// Shaped like a connector's sync routine: the operation is a registry key, not a persisted object.
const makeSyncRoutine = (operation = Ref.fromURI(DXN.make('org.example.operation.sync'))) => {
  const trigger = Trigger.make({ enabled: true, spec: Trigger.specTimer('*/10 * * * *') });
  const routine = makeRoutine({ name: 'Sync', spec: { kind: 'runnable', runnable: operation }, trigger });
  return { routine, trigger, operation };
};

describe('switchActionKind', () => {
  test('a round trip through instructions restores the operation and its trigger binding', ({ expect }) => {
    const { routine, trigger, operation } = makeSyncRoutine();
    const stash: ActionStash = {};
    expect(trigger.runnable?.uri).toBe(operation.uri);

    switchActionKind(routine, 'instructions', stash);
    expect(isRunInstructions(trigger.runnable)).toBe(true);

    switchActionKind(routine, 'runnable', stash);
    expect(Routine.runnableRef(routine)?.uri).toBe(operation.uri);
    expect(trigger.runnable?.uri).toBe(operation.uri);
  });

  test('a round trip through an operation restores the authored instructions', ({ expect }) => {
    const instructions = Instructions.make({ name: 'Body', text: 'do something' });
    const trigger = Trigger.make({ spec: Trigger.specTimer('0 9 * * *') });
    const routine = makeRoutine({ name: 'R', instructions, trigger });
    const stash: ActionStash = {};

    // No operation was ever picked, so none is restored.
    switchActionKind(routine, 'runnable', stash);
    expect(routine.spec).toBeUndefined();

    switchActionKind(routine, 'instructions', stash);
    expect(Routine.instructionsRef(routine)?.target?.id).toBe(instructions.id);
    expect(isRunInstructions(trigger.runnable)).toBe(true);
  });

  test("a stash kept for another routine does not restore that routine's action", ({ expect }) => {
    const first = makeSyncRoutine(Ref.fromURI(DXN.make('org.example.operation.first')));
    const stash: ActionStash = {};
    switchActionKind(first.routine, 'instructions', stash);

    const instructions = Instructions.make({ name: 'Body', text: 'do something' });
    const second = makeRoutine({ name: 'R', instructions, trigger: Trigger.make({}) });
    switchActionKind(second, 'runnable', stash);
    expect(second.spec).toBeUndefined();
  });
});
