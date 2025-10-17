//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Type } from '@dxos/echo';
import { Format, GeneratorAnnotation, LabelAnnotation } from '@dxos/echo/internal';

import { IconAnnotation, ItemAnnotation } from '../annotations';
import { View } from '../view';

import { Collection } from './collection';

/**
 * Project schema.
 */
export const Project = Schema.Struct({
  name: Schema.String.pipe(GeneratorAnnotation.set('commerce.productName'), Schema.optional),
  image: Schema.optional(Format.URL),
  description: Schema.optional(Schema.String),
  collections: Schema.Union(Type.Ref(Collection), Type.Ref(View)).pipe(Schema.Array, Schema.mutable),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Project',
    version: '0.1.0',
  }),
  Schema.annotations({ title: 'Project' }),
  LabelAnnotation.set(['name']),
  ItemAnnotation.set(true),
  IconAnnotation.set('ph--check-square-offset--regular'),
);
export interface Project extends Schema.Schema.Type<typeof Project> {}
