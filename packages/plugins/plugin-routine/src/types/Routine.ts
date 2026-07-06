//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Instructions, Runnable, Trigger } from '@dxos/compute';
import type { Operation } from '@dxos/compute';
import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';

import { runInstructionsRef } from '../util';

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
export class Routine extends Type.makeObject<Routine>(DXN.make('org.dxos.type.routine', '0.2.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.optional),
    description: Schema.String.pipe(Schema.optional),

    /**
     * The action to run: either an Operation (`spec.runnable`, bound directly) or the routine's own owned
     * Instructions (`spec.instructions`). For an Operation action the trigger's `runnable` points at this
     * Operation. For an Instructions action `spec.instructions` is the owned Instructions object (the operation
     * is implicitly the static RunInstructions, so no separate operation ref is stored), and the trigger's
     * `runnable` is RunInstructions with this instructions bound as its input.
     */
    // TODO(burdon): Change to Array? Or handle that case with a ComputeGraph runnable.
    spec: RoutineSpec.pipe(Schema.optional),

    /**
     * Explicit membership, bi-directional with `trigger.runnable → runnable`. Required (not derived by query)
     * because the runnable may be a shared registry operation referenced by multiple automations, which would
     * conflate triggers. MVP enforces length <= 1.
     */
    triggers: Schema.Array(Ref.Ref(Trigger.Trigger)),
  }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--lightning--regular', hue: 'amber' }),
  ),
) {}

/** Returns true when value is a Routine object. */
export const instanceOf = (value: unknown): value is Routine => Obj.instanceOf(Routine, value);

/**
 * The owned Instructions ref of an instructions-action routine, or undefined for an operation action.
 * Classification is explicit in `spec.kind`, so this needs no `.target` dereference; callers resolve the ref
 * reactively (`useObject`) or asynchronously (`Database.load`) as appropriate.
 */
export const instructionsRef = (routine: Pick<Routine, 'spec'>): Ref.Ref<Instructions.Instructions> | undefined =>
  routine.spec?.kind === 'instructions' ? routine.spec.instructions : undefined;

// Return type de-aliased to `Operation.PersistentOperation` (what `Runnable.Runnable` aliases) so this
// exported symbol's declaration names it directly — the reference that lets `tsc` emit the module's
// `.d.ts` (avoids TS2742) without keeping an otherwise-unused `Operation` import.
/** The Operation (runnable) ref of an operation-action routine, or undefined for an instructions action. */
export const runnableRef = (routine: Pick<Routine, 'spec'>): Ref.Ref<Operation.PersistentOperation> | undefined =>
  routine.spec?.kind === 'runnable' ? routine.spec.runnable : undefined;

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
export const wireTriggers = (routine: Routine): void => {
  const instructions = instructionsRef(routine);
  const fn = instructions ? runInstructionsRef() : runnableRef(routine);
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
    Obj.update(routine, (routine) => {
      routine.triggers.push(Ref.make(trigger));
    });
    // Wire the trigger's `runnable`/`input` from the action (`spec`); preserves any template-provided input.
    wireTriggers(routine);
  }
  return routine;
};
