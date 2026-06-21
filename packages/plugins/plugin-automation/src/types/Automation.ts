//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Trigger } from '@dxos/compute';
import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';

import * as Runnable from './Runnable';

/**
 * User-facing automation: a thin aggregate of an action (`runnable`) and the triggers that fire it.
 * App-level only — EDGE stays unaware of it (triggers point directly at the runnable).
 */
export const Automation = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  description: Schema.String.pipe(Schema.optional),

  /**
   * The action to run. A trigger's `function` Ref points directly at this (so EDGE/the dispatcher can run
   * it). `Runnable` is the type seam — currently just Operation; see Runnable.ts.
   */
  // TODO(burdon): Change to Array?
  runnable: Ref.Ref(Runnable.Runnable).pipe(Schema.optional),

  /**
   * Explicit membership, bi-directional with `trigger.function → runnable`. Required (not derived by query)
   * because the runnable may be a shared registry operation referenced by multiple automations, which would
   * conflate triggers. MVP enforces length <= 1.
   */
  triggers: Schema.Array(Ref.Ref(Trigger.Trigger)),
}).pipe(
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({ icon: 'ph--lightning--regular', hue: 'amber' }),
  Type.makeObject(DXN.make('org.dxos.type.automation', '0.1.0')),
);

export type Automation = Type.InstanceType<typeof Automation>;

export const instanceOf = (value: unknown): value is Automation => Obj.instanceOf(Automation, value);

export const make = (props: Obj.MakeProps<typeof Automation>) => Obj.make(Automation, props);
