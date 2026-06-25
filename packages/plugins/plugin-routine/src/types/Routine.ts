//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Instructions, Trigger } from '@dxos/compute';
import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';

import { runInstructionsRef } from '../util/run-instructions';
import * as Runnable from './Runnable';

/**
 * User-facing routine: a thin aggregate of an action (`runnable`) and the triggers that fire it.
 * App-level only — EDGE stays unaware of it (triggers point directly at the runnable).
 */
export class Routine extends Type.declareObj<Routine>()(
  Schema.Struct({
    name: Schema.String.pipe(Schema.optional),
    description: Schema.String.pipe(Schema.optional),

    /**
     * The action to run: either an Operation (bound directly) or the routine's own owned Instructions.
     * For an Operation action the trigger's `function` points at this Operation. For an Instructions action
     * `runnable` is the owned Instructions object (the operation is implicitly the static RunInstructions, so
     * no separate operation ref is stored), and the trigger's `function` is RunInstructions with this
     * instructions bound as its input.
     */
    // TODO(burdon): Change to Array?
    runnable: Schema.Union(Ref.Ref(Runnable.Runnable), Ref.Ref(Instructions.Instructions)).pipe(Schema.optional),

    /**
     * Explicit membership, bi-directional with `trigger.function → runnable`. Required (not derived by query)
     * because the runnable may be a shared registry operation referenced by multiple automations, which would
     * conflate triggers. MVP enforces length <= 1.
     */
    triggers: Schema.Array(Ref.Ref(Trigger.Trigger)),
  }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--lightning--regular', hue: 'amber' }),
    Type.makeObject(DXN.make('org.dxos.type.routine', '0.1.0')),
  ),
) {}

export const instanceOf = (value: unknown): value is Routine => Obj.instanceOf(Routine, value);

/**
 * Creates an in-memory routine draft graph. `instructions` and `trigger` are optional extras beyond the
 * schema fields: when provided they are parented under the routine, wired (runnable, trigger function,
 * triggers ref), and included in a `deep: 'parent'` clone so `saveRoutine` captures them atomically.
 * `triggers` defaults to `[]` so callers that supply a `trigger` param need not provide it.
 */
export const make = ({
  instructions,
  trigger,
  triggers = [],
  ...props
}: Omit<Obj.MakeProps<typeof Routine>, 'triggers'> & {
  triggers?: ReadonlyArray<Ref.Ref<Trigger.Trigger>>;
  instructions?: Instructions.Instructions;
  trigger?: Trigger.Trigger;
}): Routine => {
  const routine = Obj.make(Routine, { ...props, triggers });
  if (instructions) {
    Obj.setParent(instructions, routine);
    Obj.update(routine, (routine) => {
      routine.runnable = Ref.make(instructions);
    });
  }
  if (trigger) {
    Obj.setParent(trigger, routine);
    Obj.update(trigger, (trigger) => {
      trigger.function = instructions ? runInstructionsRef() : routine.runnable;
    });
    Obj.update(routine, (routine) => {
      routine.triggers = [...routine.triggers, Ref.make(trigger)];
    });
  }
  return routine;
};
