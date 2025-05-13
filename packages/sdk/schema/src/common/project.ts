//
// Copyright 2025 DXOS.org
//

import { Schema, SchemaAST } from 'effect';

import { Type } from '@dxos/echo';
import { Format, GeneratorAnnotationId, LabelAnnotationId } from '@dxos/echo-schema';

import { IconAnnotationId } from '../annotations';

/**
 * Project schema.
 */
export const ProjectSchema = Schema.Struct({
  id: Type.ObjectId,
  name: Schema.String.annotations({ [GeneratorAnnotationId]: 'commerce.productName' }),
  image: Schema.optional(Format.URL),
  description: Schema.optional(Schema.String),
}).annotations({
  [SchemaAST.TitleAnnotationId]: 'Project',
  [LabelAnnotationId]: 'name',
  [IconAnnotationId]: 'ph--kanban--regular',
});

export const Project = ProjectSchema.pipe(
  Type.def({
    typename: 'dxos.org/type/Project',
    version: '0.1.0',
  }),
);

export interface Project extends Schema.Schema.Type<typeof Project> {}
