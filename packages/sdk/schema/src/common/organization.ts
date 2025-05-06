//
// Copyright 2025 DXOS.org
//

import { Type } from '@dxos/echo';
import {
  S,
  Format,
  AST,
  GeneratorAnnotationId,
  LabelAnnotationId,
  PropertyMetaAnnotationId,
  FormatAnnotationId,
} from '@dxos/echo-schema';

import { IconAnnotationId } from '../annotations';

/**
 * Organization schema.
 */
export const OrganizationSchema = S.Struct({
  id: Type.ObjectId,
  name: S.String.annotations({ title: 'Name', [GeneratorAnnotationId]: 'company.name' }),
  description: S.optional(S.String.annotations({ title: 'Description' })),
  // TODO(wittjosiah): Support ref?
  status: S.optional(
    S.Union(S.Literal('active'), S.Literal('inactive'), S.Literal('pending'), S.Literal('archived')).annotations({
      title: 'Status',
      [PropertyMetaAnnotationId]: {
        singleSelect: {
          options: [
            { id: 'first', title: 'First', color: 'emerald' },
            { id: 'second', title: 'Second', color: 'red' },
            { id: 'third', title: 'Third', color: 'amber' },
            { id: 'fourth', title: 'Fourth', color: 'indigo' },
          ],
        },
      },
      [FormatAnnotationId]: 'single-select',
    }),
  ),
  image: S.optional(Format.URL.annotations({ title: 'Image' })),
  website: S.optional(
    Format.URL.annotations({
      title: 'Website',
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
