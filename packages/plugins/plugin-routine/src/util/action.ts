//
// Copyright 2026 DXOS.org
//

import * as Instructions from '@dxos/compute/Instructions';
import type * as Operation from '@dxos/compute/Operation';
import * as Routine from '@dxos/compute/Routine';
import { Obj, Ref } from '@dxos/echo';

import { wireTriggers } from './wire.ts';

/** The last action of each kind the editor switched a routine away from; owned by the editing session. */
export type ActionStash = {
  routine?: Routine.Routine;
  instructions?: Ref.Ref<Instructions.Instructions>;
  operation?: Ref.Ref<Operation.PersistentOperation>;
};

/**
 * Switch the routine's action kind and re-wire its triggers, restoring the action the routine last had of that
 * kind, so a look at the other kind does not leave its triggers with nothing to run.
 */
export const switchActionKind = (routine: Routine.Routine, next: Routine.Kind, stash: ActionStash): void => {
  // A stash kept for another routine (a form reused for a different subject) holds nothing for this one.
  if (stash.routine !== routine) {
    stash.routine = routine;
    stash.instructions = undefined;
    stash.operation = undefined;
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
