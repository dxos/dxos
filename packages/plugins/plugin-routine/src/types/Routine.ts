//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Instructions, Trigger } from '@dxos/compute';
import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';

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

export const make = (props: Obj.MakeProps<typeof Routine>) => Obj.make(Routine, props);
