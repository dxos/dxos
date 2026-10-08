//
// Copyright 2026 DXOS.org
//

import * as Instructions from '@dxos/compute/Instructions';
import type * as Operation from '@dxos/compute/Operation';
import * as Routine from '@dxos/compute/Routine';
import { Obj, Ref } from '@dxos/echo';

import { wireTriggers } from './wire.ts';

/** The last action of each kind a routine was switched away from. */
type ActionStash = {
  readonly instructions?: Ref.Ref<Instructions.Instructions>;
  readonly operation?: Ref.Ref<Operation.PersistentOperation>;
};

// Keyed by routine because the routine editor remounts on every kind switch, which would drop a stash it held.
const stashes = new WeakMap<Routine.Routine, ActionStash>();

/**
 * Switch the routine's action kind and re-wire its triggers, restoring the action the routine last had of that
 * kind, so a look at the other kind does not leave its triggers with nothing to run.
 */
export const switchActionKind = (routine: Routine.Routine, next: Routine.Kind): void => {
  const previous = stashes.get(routine);
  const stash: ActionStash = {
    instructions: Routine.instructionsRef(routine) ?? previous?.instructions,
    operation: Routine.runnableRef(routine) ?? previous?.operation,
  };
  stashes.set(routine, stash);
  Obj.update(routine, (routine) => {
    if (next === 'runnable') {
      // With no operation to restore the action stays unset until one is picked.
      routine.spec = stash.operation ? { kind: 'runnable', runnable: stash.operation } : undefined;
    } else if (routine.spec?.kind !== 'instructions') {
      routine.spec = { kind: 'instructions', instructions: stash.instructions ?? Ref.make(Instructions.make({})) };
    }
  });
  wireTriggers(routine);
};
