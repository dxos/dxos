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

// TODO(burdon): Remove.
export const OrganizationStatusOptions = [
  { id: 'prospect', title: 'Prospect', color: 'indigo' },
  { id: 'qualified', title: 'Qualified', color: 'purple' },
  { id: 'active', title: 'Active', color: 'amber' },
  { id: 'commit', title: 'Commit', color: 'emerald' },
  { id: 'reject', title: 'Reject', color: 'red' },
];

/**
 * Organization schema.
 */
export const OrganizationSchema = S.Struct({
  id: Type.ObjectId,
  name: S.optional(S.String.annotations({ title: 'Name', [GeneratorAnnotationId]: 'company.name' })),
  description: S.optional(S.String.annotations({ title: 'Description' })),
  // TODO(wittjosiah): Remove; change to relation.
  status: S.optional(
    S.Union(
      S.Literal('prospect'),
      S.Literal('qualified'),
      S.Literal('active'),
      S.Literal('commit'),
      S.Literal('reject'),
    ).annotations({
      title: 'Status',
      [PropertyMetaAnnotationId]: {
        singleSelect: {
          options: OrganizationStatusOptions,
        },
      },
      [FormatAnnotationId]: 'single-select',
    }),
  ),
  // TODO(wittjosiah): Format.URL (currently breaks schema validation). Support ref?
  image: S.optional(S.String.annotations({ title: 'Image' })),
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
