//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import {
  FormatAnnotation,
  FormatEnum,
  GeneratorAnnotation,
  LabelAnnotation,
  PropertyMetaAnnotationId,
} from '@dxos/echo-schema';

import { IconAnnotation } from '../annotations';

// TODO(burdon): Remove (specific to kanban demo).
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
  name: Schema.optional(
    Schema.String.pipe(Schema.annotations({ title: 'Name' }), GeneratorAnnotation.set(['company.name', 1])),
  ),
  description: Schema.optional(Schema.String.annotations({ title: 'Description' })),
  // TODO(wittjosiah): Remove; 1change to relation.
  status: Schema.optional(
    Schema.Literal('prospect', 'qualified', 'active', 'commit', 'reject')
      .pipe(FormatAnnotation.set(FormatEnum.SingleSelect))
      .annotations({
        title: 'Status',
        [PropertyMetaAnnotationId]: {
          singleSelect: {
            options: OrganizationStatusOptions,
          },
        },
      }),
  ),
  // TODO(wittjosiah): Format.URL (currently breaks schema validation). Support ref?
  image: Schema.optional(Schema.String.annotations({ title: 'Image' })),
  website: Schema.optional(
    Format.URL.annotations({
      title: 'Website',
    }).pipe(GeneratorAnnotation.set('internet.url')),
  ),
}).pipe(
  Schema.annotations({ title: 'Organization', description: 'An organization.' }),
  LabelAnnotation.set(['name']),
  IconAnnotation.set('ph--building--regular'),
);

export const Organization = OrganizationSchema.pipe(
  Type.Obj({
    typename: 'dxos.org/type/Organization',
    version: '0.1.0',
  }),
);

export interface Organization extends Schema.Schema.Type<typeof Organization> {}
