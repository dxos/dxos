//
// Copyright 2026 DXOS.org
//

import * as Instructions from '@dxos/compute/Instructions';
import type * as Operation from '@dxos/compute/Operation';
import * as Routine from '@dxos/compute/Routine';
import type * as Trigger from '@dxos/compute/Trigger';
import { Obj, Ref } from '@dxos/echo';

import { wireTriggers } from './wire.ts';

type TriggerInputs = Record<string, Trigger.Trigger['input']>;

/**
 * The last action of each kind the editor switched a routine away from, with its triggers' inputs (by trigger id);
 * owned by the editing session.
 */
export type ActionStash = {
  routine?: Routine.Routine;
  instructions?: Ref.Ref<Instructions.Instructions>;
  operation?: Ref.Ref<Operation.PersistentOperation>;
  inputs?: Partial<Record<Routine.Kind, TriggerInputs>>;
};

/**
 * Switch the routine's action kind and re-wire its triggers, restoring the action and trigger inputs the routine
 * last had of that kind, so a look at the other kind neither leaves its triggers with nothing to run nor carries one
 * kind's input bindings into the other's strictly validated input.
 */
export const switchActionKind = (routine: Routine.Routine, next: Routine.Kind, stash: ActionStash): void => {
  // A stash kept for another routine (a form reused for a different subject) holds nothing for this one.
  if (stash.routine !== routine) {
    stash.routine = routine;
    stash.instructions = undefined;
    stash.operation = undefined;
    stash.inputs = undefined;
  }
  // An unset action is the operation kind with none chosen yet.
  const current = routine.spec?.kind ?? 'runnable';
  if (current === next) {
    return;
  }
  // Record the action of the kind being left even when it is none, so an action cleared on purpose stays cleared.
  if (current === 'runnable') {
    stash.operation = Routine.runnableRef(routine);
  } else {
    stash.instructions = Routine.instructionsRef(routine);
  }
  stash.inputs = { ...stash.inputs, [current]: triggerInputs(routine) };
  const restored = stash.inputs[next] ?? {};
  for (const ref of routine.triggers) {
    const trigger = ref.target;
    if (trigger) {
      Obj.update(trigger, (trigger) => {
        trigger.input = restored[trigger.id];
      });
    }
  }
  const { instructions, operation } = stash;
  Obj.update(routine, (routine) => {
    if (next === 'runnable') {
      routine.spec = operation ? { kind: 'runnable', runnable: operation } : undefined;
    } else {
      routine.spec = { kind: 'instructions', instructions: instructions ?? Ref.make(Instructions.make({})) };
    }
  });
  wireTriggers(routine);
};

/** Snapshots, not the live inputs: the trigger's input is replaced next, and refs inside are kept as-is. */
const triggerInputs = (routine: Routine.Routine): TriggerInputs =>
  Object.fromEntries(
    routine.triggers.flatMap((ref) =>
      ref.target ? [[ref.target.id, Obj.getSnapshot(ref.target).input] as const] : [],
    ),
  );
