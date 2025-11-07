//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj } from '@dxos/echo';
import { Type } from '@dxos/echo';
import { Format, GeneratorAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { Collection, IconAnnotation, ItemAnnotation, View } from '@dxos/schema';
import { opaque } from '@dxos/effect';

export class Project extends opaque(
  Schema.Struct({
    name: Schema.String.pipe(GeneratorAnnotation.set('commerce.productName'), Schema.optional),
    description: Schema.String.pipe(Schema.optional),
    image: Format.URL.pipe(Schema.annotations({ title: 'Image' }), Schema.optional),
    collections: Schema.Union(Type.Ref(Collection.Collection), Type.Ref(View.View)).pipe(Schema.Array, Schema.mutable),
  }).pipe(
    Type.Obj({
      typename: 'dxos.org/type/Project',
      version: '0.1.0',
    }),
    Schema.annotations({ title: 'Project' }),
    LabelAnnotation.set(['name']),
    ItemAnnotation.set(true),
    IconAnnotation.set('ph--check-square-offset--regular'),
  ),
) {}

export const make = (props: Partial<Obj.MakeProps<typeof Project>> = {}): Project =>
  Obj.make(Project, {
    collections: [],
    ...props,
  });
