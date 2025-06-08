//
// Copyright 2025 DXOS.org
//

import { Schema, SchemaAST } from 'effect';

import { Format, Type } from '@dxos/echo';
import {
  FormatAnnotationId,
  GeneratorAnnotationId,
  LabelAnnotationId,
  PropertyMetaAnnotationId,
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
 * https://schema.org/Organization
 */
const OrganizationSchema = Schema.Struct({
  id: Type.ObjectId,
  name: Schema.optional(Schema.String.annotations({ title: 'Name', [GeneratorAnnotationId]: 'company.name' })),
  description: Schema.optional(Schema.String.annotations({ title: 'Description' })),
  // TODO(wittjosiah): Remove; change to relation.
  status: Schema.optional(
    Schema.Literal('prospect', 'qualified', 'active', 'commit', 'reject').annotations({
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
  image: Schema.optional(Schema.String.annotations({ title: 'Image' })),
  website: Schema.optional(
    Format.URL.annotations({
      title: 'Website',
      [GeneratorAnnotationId]: 'internet.url',
    }),
  ),
}).annotations({
  [SchemaAST.TitleAnnotationId]: 'Organization',
  [LabelAnnotationId]: 'name',
  [IconAnnotationId]: 'ph--building--regular',
});

export const Organization = OrganizationSchema.pipe(
  Type.def({
    typename: 'dxos.org/type/Organization',
    version: '0.1.0',
  }),
).annotations({
  description: 'An organization.',
});

export interface Organization extends Schema.Schema.Type<typeof Organization> {}
