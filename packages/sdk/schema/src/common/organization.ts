//
// Copyright 2025 DXOS.org
//

import { Type } from '@dxos/echo';
import { S, Format, AST, GeneratorAnnotationId, LabelAnnotationId } from '@dxos/echo-schema';

import { IconAnnotationId } from '../annotations';

export const OrganizationSchema = S.Struct({
  id: Type.ObjectId,
  name: S.String.annotations({
    [GeneratorAnnotationId]: 'company.name',
  }),
  // TODO(wittjosiah): Support ref?
  image: S.optional(Format.URL),
  website: S.optional(
    Format.URL.annotations({
      [AST.TitleAnnotationId]: 'Website',
      [GeneratorAnnotationId]: 'internet.url',
    }),
  ),
}).annotations({
  [AST.TitleAnnotationId]: 'Organization',
  [LabelAnnotationId]: 'name',
  [IconAnnotationId]: 'ph--building--regular',
});

export const Organization = OrganizationSchema.pipe(
  Type.def({
    typename: 'dxos.org/type/Organization',
    version: '0.1.0',
  }),
);
export type Organization = S.Schema.Type<typeof Organization>;
