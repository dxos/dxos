//
// Copyright 2026 DXOS.org
//

import { type Instructions, Routine, type Trigger } from '@dxos/compute';
import { Obj, Ref } from '@dxos/echo';

import { runInstructionsRef } from './run-instructions';

/** Strip a stale `instructions` binding from a trigger input. */
const withoutInstructions = (input: Record<string, unknown> | undefined): Record<string, unknown> | undefined => {
  if (!input || !('instructions' in input)) {
    return input;
  }
  const { instructions: _drop, ...rest } = input;
  return rest;
};

/**
 * Wire the routine's owned triggers to dispatch its current action (`spec`): an instructions action sets each
 * trigger's `runnable` to RunInstructions with the owned instructions bound into `input`; an operation action
 * binds the operation directly and drops any stale instructions binding. Call after the action (`spec`) changes
 * so a trigger never keeps a binding for the previous action.
 */
export const wireTriggers = (routine: Routine.Routine): void => {
  const instructions = Routine.instructionsRef(routine);
  const fn = instructions ? runInstructionsRef() : Routine.runnableRef(routine);
  for (const ref of routine.triggers) {
    const trigger = ref.target;
    if (!trigger) {
      continue;
    }
    Obj.update(trigger, (trigger) => {
      trigger.runnable = fn;
      const base = withoutInstructions(trigger.input);
      trigger.input = instructions ? { input: {}, ...base, instructions } : base;
    });
  }
};

/**
 * Creates a fully-wired in-memory routine graph. `instructions` and `trigger` are optional extras beyond the
 * schema fields: when provided they are parented under the routine and wired together (runnable, trigger
 * runnable, the trigger's instructions input binding, and the `triggers` ref) so that a single `Database.add`
 * cascades the whole graph. `triggers` defaults to `[]` so callers that supply a `trigger` need not provide it.
 */
export const makeRoutine = ({
  instructions,
  trigger,
  triggers = [],
  ...props
}: Omit<Obj.MakeProps<typeof Routine.Routine>, 'triggers'> & {
  triggers?: ReadonlyArray<Ref.Ref<Trigger.Trigger>>;
  instructions?: Instructions.Instructions;
  trigger?: Trigger.Trigger;
}): Routine.Routine => {
  const routine = Routine.make({ ...props, triggers });
  if (instructions) {
    Obj.setParent(instructions, routine);
    Obj.update(routine, (routine) => {
      routine.spec = { kind: 'instructions', instructions: Ref.make(instructions) };
    });
  }
  if (trigger) {
    Obj.setParent(trigger, routine);
    Obj.update(routine, (routine) => {
      routine.triggers.push(Ref.make(trigger));
    });
  }
  // Wire every attached trigger (singular or `triggers`) from the action; preserves template-provided
  // input. Gated on `spec`: with no action yet, wiring would null out pre-set trigger runnables.
  if (routine.spec) {
    wireTriggers(routine);
  }
  return routine;
};
