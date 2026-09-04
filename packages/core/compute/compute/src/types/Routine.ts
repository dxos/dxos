//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';

import type * as Operation from '../Operation';
import * as Runnable from '../Runnable';
import * as Instructions from './Instructions';
import * as Trigger from './Trigger';

const Kinds = ['runnable', 'instructions'] as const;
export const Kind = Schema.Literals(Kinds);
export type Kind = (typeof Kinds)[number];

const RunnableSpec = Schema.Struct({
  kind: Schema.Literal('runnable'),
  runnable: Ref.Ref(Runnable.Runnable),
});

const InstructionsSpec = Schema.Struct({
  kind: Schema.Literal('instructions'),
  /** Owned by the routine: `SetParent` cascades it. */
  instructions: Ref.Ref(Instructions.Instructions).pipe(Annotation.SetParent.set(true)),
});

const RoutineSpec = Schema.Union([RunnableSpec, InstructionsSpec]);

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
    triggers: Schema.Array(Ref.Ref(Trigger.Trigger)).pipe(Annotation.SetParent.set(true)),
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

/** Factory wrapper around `Obj.make` for {@link Routine}. Trigger wiring lives in plugin-routine (`makeRoutine`). */
export const make = (
  props: Omit<Obj.MakeProps<typeof Routine>, 'triggers'> & { triggers?: ReadonlyArray<Ref.Ref<Trigger.Trigger>> },
): Routine => Obj.make(Routine, { ...props, triggers: props.triggers ?? [] });
