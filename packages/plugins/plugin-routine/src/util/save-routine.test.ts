//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Instructions, Operation, Trigger } from '@dxos/compute';
import { type Database, DXN, Filter, Obj, Ref } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { EffectEx } from '@dxos/effect';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';
import { Text } from '@dxos/schema';

import { Routine } from '#types';

import { isRunInstructions, runnableInstructions } from './run-instructions';
import { primaryTrigger, saveRoutine } from './save-routine';

const types = [Routine.Routine, Instructions.Instructions, Trigger.Trigger, Operation.PersistentOperation, Text.Text];

const TestOperation = Operation.make({
  meta: { key: DXN.make('org.dxos.test.reportOperation'), name: 'Report' },
  input: Schema.Struct({}),
  output: Schema.Struct({}),
});

describe('saveRoutine', () => {
  // The draft is a single in-memory routine graph (built by Routine.make); saveRoutine persists it on
  // create (a single add cascades the parented children) and reconciles it on edit (a deep 'parent' clone).

  test('operation-action draft with a trigger spec persists the trigger and its input binding', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [ClientPlugin({ types })] });
    const db = await initSpace(harness);

    const operation = db.add(Operation.serialize(TestOperation));
    const draft = Routine.make({
      name: 'Magazine',
      runnable: Ref.make(operation),
      trigger: Trigger.make({ spec: Trigger.specTimer('0 9 * * *'), input: {} }),
    });

    const routine = await saveRoutine(db, draft);

    const trigger = primaryTrigger(routine);
    expect(trigger).toBeDefined();
    expect(trigger!.spec?.kind).toBe('timer');
    expect(trigger!.function).toBeDefined();
    expect(routine.triggers).toHaveLength(1);
  });

  test('blank instructions draft with a trigger spec set via the editor persists the trigger', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [ClientPlugin({ types })] });
    const db = await initSpace(harness);

    const draft = Routine.make({
      name: 'Blank',
      instructions: Instructions.make({ name: 'Blank', text: 'do something' }),
      trigger: Trigger.make({}),
    });

    // Simulate the user picking a trigger kind via TriggerEditor (Obj.update on the in-memory trigger spec).
    const draftTrigger = primaryTrigger(draft)!;
    Obj.update(draftTrigger, (draftTrigger) => {
      draftTrigger.spec = Trigger.specTimer('0 9 * * *');
    });

    const routine = await saveRoutine(db, draft);

    const trigger = primaryTrigger(routine);
    expect(trigger).toBeDefined();
    expect(trigger!.spec?.kind).toBe('timer');
    // The runnable is the owned instructions; the trigger dispatches it through RunInstructions with the
    // instructions bound into the trigger input.
    const owned = ownedInstructions(await db.query(Filter.type(Instructions.Instructions)).run(), routine);
    expect(owned).toHaveLength(1);
    expect(runnableInstructions(routine.runnable)?.id).toBe(owned[0].id);
    expect(isRunInstructions(trigger!.function)).toBe(true);
    const instructionsRef = trigger!.input?.instructions;
    expect(Ref.isRef(instructionsRef) ? instructionsRef.target?.id : undefined).toBe(owned[0].id);
  });

  test('promotes an instructions action + trigger, then reconciles without duplicating on re-save', async ({
    expect,
  }) => {
    await using harness = await createComposerTestApp({ plugins: [ClientPlugin({ types })] });
    const db = await initSpace(harness);

    const routine = await saveRoutine(
      db,
      Routine.make({
        name: 'Digest',
        instructions: Instructions.make({ name: 'Digest', text: 'first body' }),
        trigger: Trigger.make({ spec: Trigger.specTimer('0 9 * * *') }),
      }),
    );

    // Exactly one owned instructions, with the saved body.
    const owned = ownedInstructions(await db.query(Filter.type(Instructions.Instructions)).run(), routine);
    expect(owned).toHaveLength(1);
    expect(owned[0].text?.target?.content).toBe('first body');

    // A new routine's trigger starts enabled (committing a reviewed draft turns it on).
    expect(runnableInstructions(routine.runnable)?.id).toBe(owned[0].id);
    const trigger = primaryTrigger(routine);
    expect(trigger).toBeDefined();
    expect(isRunInstructions(trigger!.function)).toBe(true);
    expect(trigger!.enabled).toBe(true);

    // The toolbar disables the trigger; re-saving an edit must preserve the toolbar-owned flag.
    Obj.update(trigger!, (trigger) => {
      trigger.enabled = false;
    });

    // Edit session: a deep 'owned' clone with the body changed. Re-saving edits in place — still exactly one
    // instructions and one trigger, body updated, `enabled` preserved.
    const editDraft = Obj.clone(routine, { deep: 'parent', retainId: true });
    const editInstructions = runnableInstructions(editDraft.runnable)!;
    Doc.updateText(editInstructions.text!.target!, ['content'], 'second body');
    await saveRoutine(db, editDraft);

    const ownedAfter = ownedInstructions(await db.query(Filter.type(Instructions.Instructions)).run(), routine);
    expect(ownedAfter).toHaveLength(1);
    expect(ownedAfter[0].id).toBe(owned[0].id);
    expect(ownedAfter[0].text?.target?.content).toBe('second body');
    expect(routine.triggers).toHaveLength(1);
    expect(primaryTrigger(routine)!.enabled).toBe(false);
  });

  test('switching an operation action to instructions replaces the runnable and adds owned instructions', async ({
    expect,
  }) => {
    await using harness = await createComposerTestApp({ plugins: [ClientPlugin({ types })] });
    const db = await initSpace(harness);

    // An existing operation routine: `runnable` is a (non-RunInstructions) operation, with no owned instructions.
    const operation = db.add(Operation.serialize(TestOperation));
    const routine = await saveRoutine(
      db,
      Routine.make({
        name: 'Report',
        runnable: Ref.make(operation),
        trigger: Trigger.make({ spec: Trigger.specTimer('0 9 * * *') }),
      }),
    );

    // Edit session: switch the action to instructions — point the runnable at a freshly-authored owned
    // instructions (as the form's action editor does on switch).
    const editDraft = Obj.clone(routine, { deep: 'parent', retainId: true });
    const instructions = Instructions.make({ name: 'Report', text: 'summarize the inbox' });
    Obj.setParent(instructions, editDraft);
    Obj.update(editDraft, (editDraft) => {
      editDraft.runnable = Ref.make(instructions);
    });

    await saveRoutine(db, editDraft);

    // The runnable now points at a freshly-created owned instructions, dispatched through RunInstructions.
    const owned = ownedInstructions(await db.query(Filter.type(Instructions.Instructions)).run(), routine);
    expect(owned).toHaveLength(1);
    expect(owned[0].text?.target?.content).toBe('summarize the inbox');
    expect(runnableInstructions(routine.runnable)?.id).toBe(owned[0].id);
    expect(isRunInstructions(primaryTrigger(routine)!.function)).toBe(true);
  });
});

const ownedInstructions = (all: Instructions.Instructions[], routine: Routine.Routine): Instructions.Instructions[] =>
  all.filter((instructions) => Obj.getParent(instructions)?.id === routine.id);

const initSpace = async (harness: Awaited<ReturnType<typeof createComposerTestApp>>): Promise<Database.Database> => {
  const { personalSpace } = await EffectEx.runAndForwardErrors(
    initializeIdentity(harness.get(ClientCapabilities.Client)),
  );
  await harness.waitForEvent(ClientEvents.SpacesReady);
  return personalSpace.db;
};
