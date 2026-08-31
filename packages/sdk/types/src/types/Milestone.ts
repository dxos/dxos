//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Format, Obj, Type } from '@dxos/echo';
import { GeneratorAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';

/**
 * An ordered span of work within a {@link TaskSet}, mirroring a Linear/GitHub milestone (sync
 * provenance is carried by `Obj.getMeta` foreign keys). Membership is the `Task.milestone` ref;
 * there is no task ref array here, and sequence is the `TaskSet.milestones` array order.
 *
 * Carries no status: progress is a percentage derived from its tasks, so a milestone cannot
 * disagree with the work it contains.
 */
export class Milestone extends Type.makeObject<Milestone>(DXN.make('org.dxos.type.milestone', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.pipe(GeneratorAnnotation.set('commerce.productName')),
    /** What done means for this milestone. */
    description: Schema.String.pipe(Schema.annotate({ title: 'Description' }), Schema.optional),
    targetDate: Format.DateOnly.pipe(Schema.annotate({ title: 'Target Date' }), Schema.optional),
  }).pipe(
    Schema.annotate({ title: 'Milestone' }),
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--flag-banner--regular', hue: 'amber' }),
  ),
) {}

/** Factory wrapper around `Obj.make` for {@link Milestone}. */
export const make = (props: Obj.MakeProps<typeof Milestone>): Milestone => Obj.make(Milestone, props);
