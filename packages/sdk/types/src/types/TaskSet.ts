//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';
import { GeneratorAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { Format } from '@dxos/echo/Format';

/**
 * Lightweight collection of tasks, native or mirrored from a remote service (e.g. GitHub repos,
 * Linear projects). Sync provenance is carried by `Obj.getMeta` foreign keys, not the type.
 * Membership is the `Task.taskSet` backref; there is no task ref array here.
 */
export class TaskSet extends Type.makeObject<TaskSet>(DXN.make('org.dxos.type.taskSet', '0.2.0'))(
  Schema.Struct({
    name: Schema.String.pipe(GeneratorAnnotation.set('commerce.productName'), Schema.optional),
    description: Schema.String.pipe(Schema.optional),
    image: Format.URL.pipe(Schema.annotations({ title: 'Image' }), Schema.optional),
  }).pipe(
    Schema.annotations({ title: 'Task Set' }),
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--check-square-offset--regular', hue: 'indigo' }),
  ),
) {}

/** Factory wrapper around `Obj.make` for {@link TaskSet}. */
export const make = (props: Partial<Obj.MakeProps<typeof TaskSet>> = {}): TaskSet => Obj.make(TaskSet, { ...props });

/**
 * The pre-rename `ExternalProject` object (`org.dxos.type.externalProject@0.1.0`), kept solely so
 * the typename migration can read existing data. Never constructed.
 * @deprecated Use {@link TaskSet}.
 */
export class LegacyExternalProject extends Type.makeObject<LegacyExternalProject>(
  DXN.make('org.dxos.type.externalProject', '0.1.0'),
)(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),
    image: Schema.optional(Format.URL),
  }),
) {}
