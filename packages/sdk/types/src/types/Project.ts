//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Obj, Type } from '@dxos/echo';
import { Format, GeneratorAnnotation, LabelAnnotation } from '@dxos/echo/internal';

export const Project = Schema.Struct({
  name: Schema.String.pipe(GeneratorAnnotation.set('commerce.productName'), Schema.optional),
  description: Schema.String.pipe(Schema.optional),
  image: Format.URL.pipe(Schema.annotations({ title: 'Image' }), Schema.optional),
}).pipe(
  Type.object(DXN.make('org.dxos.type.project', '0.1.0')),
  Schema.annotations({ title: 'Project' }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--check-square-offset--regular',
    hue: 'indigo',
  }),
);

export interface Project extends Schema.Schema.Type<typeof Project> {}

/** Factory wrapper around `Obj.make` for {@link Project}. */
export const make = (props: Partial<Obj.MakeProps<typeof Project>> = {}): Project =>
  Obj.make(Project, {
    ...props,
  });
