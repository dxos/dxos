//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { Format, GeneratorAnnotation, LabelAnnotation } from '@dxos/echo-schema';

import { IconAnnotation, ItemAnnotation } from '../annotations';
import { View } from '../view';

import { Collection } from './collection';

/**
 * Project schema.
 */
export const Project = Schema.Struct({
  id: Type.ObjectId,
  name: Schema.String.pipe(GeneratorAnnotation.set('commerce.productName'), Schema.optional),
  image: Schema.optional(Format.URL),
  description: Schema.optional(Schema.String),
  // prettier-ignore
  collections: Schema.Array(
    Schema.Union(
      Type.Ref(Collection),
      Type.Ref(View),
    ),
  ).pipe(Schema.mutable),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Project',
    version: '0.1.0',
  }),
  Schema.annotations({ title: 'Project' }),
  LabelAnnotation.set(['name']),
  ItemAnnotation.set(true),
  IconAnnotation.set('ph--kanban--regular'),
);
export interface Project extends Schema.Schema.Type<typeof Project> {}
