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

const Kinds = ['runnable', 'instructions'] as const;
export const Kind = Schema.Literal(...Kinds);
export type Kind = (typeof Kinds)[number];

const RunnableSpec = Schema.Struct({
  kind: Schema.Literal('runnable'),
  runnable: Ref.Ref(Runnable.Runnable),
});

const InstructionsSpec = Schema.Struct({
  kind: Schema.Literal('instructions'),
  instructions: Ref.Ref(Instructions.Instructions),
});

const RoutineSpec = Schema.Union(RunnableSpec, InstructionsSpec);

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
    // TODO(burdon): Change to Array? Or handle that case with a ComputeGraph runnable.
    spec: RoutineSpec.pipe(Schema.optional),

    /**
     * Explicit membership, bi-directional with `trigger.function → runnable`. Required (not derived by query)
     * because the runnable may be a shared registry operation referenced by multiple automations, which would
     * conflate triggers. MVP enforces length <= 1.
     */
    triggers: Schema.Array(Ref.Ref(Trigger.Trigger)),
  }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--lightning--regular', hue: 'amber' }),
    Type.makeObject(DXN.make('org.dxos.type.routine', '0.2.0')),
  ),
) {}

export const instanceOf = (value: unknown): value is Routine => Obj.instanceOf(Routine, value);

/**
 * The owned Instructions ref of an instructions-action routine, or undefined for an operation action.
 * Classification is explicit in `spec.kind`, so this needs no `.target` dereference; callers resolve the ref
 * reactively (`useObject`) or asynchronously (`Database.load`) as appropriate.
 */
export const instructionsRef = (routine: Pick<Routine, 'spec'>): Ref.Ref<Instructions.Instructions> | undefined =>
  routine.spec?.kind === 'instructions' ? routine.spec.instructions : undefined;

/** The Operation (runnable) ref of an operation-action routine, or undefined for an instructions action. */
export const runnableRef = (routine: Pick<Routine, 'spec'>): Ref.Ref<Runnable.Runnable> | undefined =>
  routine.spec?.kind === 'runnable' ? routine.spec.runnable : undefined;

/**
 * Creates a fully-wired in-memory routine graph. `instructions` and `trigger` are optional extras beyond the
 * schema fields: when provided they are parented under the routine and wired together (runnable, trigger
 * function, the trigger's instructions input binding, and the `triggers` ref) so that a single `Database.add`
 * cascades the whole graph. `triggers` defaults to `[]` so callers that supply a `trigger` need not provide it.
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
      routine.spec = { kind: 'instructions', instructions: Ref.make(instructions) };
    });
  }
  if (trigger) {
    Obj.setParent(trigger, routine);
    Obj.update(trigger, (trigger) => {
      // An instructions action dispatches through RunInstructions with the owned instructions bound into the
      // trigger input (preserving any template-provided input fields); an operation action binds the operation
      // directly, with its input supplied by the template.
      trigger.function = instructions ? runInstructionsRef() : runnableRef(routine);
      if (instructions) {
        trigger.input = { input: {}, ...trigger.input, instructions: Ref.make(instructions) };
      }
    });
    Obj.update(routine, (routine) => {
      routine.triggers.push(Ref.make(trigger));
    });
  }
  return routine;
};
