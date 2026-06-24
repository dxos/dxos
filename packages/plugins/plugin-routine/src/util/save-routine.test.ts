//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Instructions, Trigger } from '@dxos/compute';
import { type Database, Filter, Obj, type Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';
import { Text } from '@dxos/schema';

import { Routine } from '#types';

import { isRunInstructions } from './run-instructions';
import { type RoutineDraft, saveRoutine } from './save-routine';

const types = [Routine.Routine, Instructions.Instructions, Trigger.Trigger, Text.Text];

describe('saveRoutine', () => {
  test('promotes an instructions action + trigger, then merges without duplicating on re-save', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [ClientPlugin({ types })] });
    const db = await initSpace(harness);

    const routine = db.add(Routine.make({ name: 'Digest', triggers: [] }));

    await saveRoutine(db, routine, makeDraft(routine, 'first body', true));

    // Exactly one owned instructions, with the saved body.
    const owned = ownedInstructions(await db.query(Filter.type(Instructions.Instructions)).run(), routine);
    expect(owned).toHaveLength(1);
    expect(owned[0].text?.target?.content).toBe('first body');

    // The action runs through RunInstructions, and the trigger dispatches it with the instructions bound.
    expect(isRunInstructions(routine.runnable)).toBe(true);
    const trigger = primaryTrigger(routine);
    expect(trigger).toBeDefined();
    expect(isRunInstructions(trigger!.function)).toBe(true);
    expect(trigger!.enabled).toBe(true);
    expect((trigger!.input?.instructions as Ref.Ref<any> | undefined)?.target?.id).toBe(owned[0].id);

    // Re-saving edits in place: still exactly one instructions and one trigger.
    await saveRoutine(db, routine, makeDraft(routine, 'second body', false));

    const ownedAfter = ownedInstructions(await db.query(Filter.type(Instructions.Instructions)).run(), routine);
    expect(ownedAfter).toHaveLength(1);
    expect(ownedAfter[0].id).toBe(owned[0].id);
    expect(ownedAfter[0].text?.target?.content).toBe('second body');
    expect(routine.triggers).toHaveLength(1);
    expect(primaryTrigger(routine)!.enabled).toBe(false);
  });
});

const makeDraft = (routine: Routine.Routine, body: string, enabled: boolean): RoutineDraft => ({
  routine: Obj.clone(routine),
  instructions: Instructions.make({ name: routine.name, text: body }),
  trigger: Trigger.make({ spec: Trigger.specTimer('0 9 * * *'), enabled }),
});

const ownedInstructions = (all: Instructions.Instructions[], routine: Routine.Routine): Instructions.Instructions[] =>
  all.filter((instructions) => Obj.getParent(instructions)?.id === routine.id);

const primaryTrigger = (routine: Routine.Routine): Trigger.Trigger | undefined => {
  for (const ref of routine.triggers) {
    const target = ref.target;
    if (Obj.instanceOf(Trigger.Trigger, target)) {
      return target;
    }
  }
  return undefined;
};

const initSpace = async (harness: Awaited<ReturnType<typeof createComposerTestApp>>): Promise<Database.Database> => {
  const { personalSpace } = await EffectEx.runAndForwardErrors(
    initializeIdentity(harness.get(ClientCapabilities.Client)),
  );
  await harness.waitForEvent(ClientEvents.SpacesReady);
  return personalSpace.db;
};
