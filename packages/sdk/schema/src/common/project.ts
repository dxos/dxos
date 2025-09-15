//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { Format, GeneratorAnnotation, LabelAnnotation } from '@dxos/echo-schema';

import { IconAnnotation, ItemAnnotation } from '../annotations';

/**
 * Project schema.
 */
const ProjectSchema = Schema.Struct({
  id: Type.ObjectId,
  name: Schema.String.pipe(GeneratorAnnotation.set('commerce.productName')),
  image: Schema.optional(Format.URL),
  description: Schema.optional(Schema.String),
}).pipe(
  Schema.annotations({ title: 'Project' }),
  LabelAnnotation.set(['name']),
  ItemAnnotation.set(true),
  IconAnnotation.set('ph--kanban--regular'),
);

export const Project = ProjectSchema.pipe(
  Type.Obj({
    typename: 'dxos.org/type/Project',
    version: '0.1.0',
  }),
);

export interface Project extends Schema.Schema.Type<typeof Project> {}
