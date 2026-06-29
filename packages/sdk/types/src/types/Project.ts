//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';
import { GeneratorAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { Format } from '@dxos/echo/Format';

export class Project extends Type.makeObject<Project>(DXN.make('org.dxos.type.project', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.pipe(GeneratorAnnotation.set('commerce.productName'), Schema.optional),
    description: Schema.String.pipe(Schema.optional),
    image: Format.URL.pipe(Schema.annotations({ title: 'Image' }), Schema.optional),
  }).pipe(
    Schema.annotations({ title: 'Project' }),
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--check-square-offset--regular', hue: 'indigo' }),
  ),
) {}

/** Factory wrapper around `Obj.make` for {@link Project}. */
export const make = (props: Partial<Obj.MakeProps<typeof Project>> = {}): Project =>
  Obj.make(Project, {
    ...props,
  });
