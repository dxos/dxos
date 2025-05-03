//
// Copyright 2025 DXOS.org
//

import { Type } from '@dxos/echo';
import { S, AST, GeneratorAnnotationId, LabelAnnotationId } from '@dxos/echo-schema';

import { IconAnnotationId } from '../annotations';

export const ProjectSchema = S.Struct({
  id: Type.ObjectId,
  name: S.String.annotations({ [GeneratorAnnotationId]: 'commerce.productName' }),
  description: S.optional(S.String),
}).annotations({
  [AST.TitleAnnotationId]: 'Project',
  [LabelAnnotationId]: 'name',
  [IconAnnotationId]: 'ph--kanban--regular',
});

export const Project = ProjectSchema.pipe(
  Type.def({
    typename: 'dxos.org/type/Project',
    version: '0.1.0',
  }),
);
export type Project = S.Schema.Type<typeof Project>;
