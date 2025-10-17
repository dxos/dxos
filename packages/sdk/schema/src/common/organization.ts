//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Type } from '@dxos/echo';
import {
  FormatAnnotation,
  FormatEnum,
  GeneratorAnnotation,
  LabelAnnotation,
  PropertyMetaAnnotationId,
} from '@dxos/echo/internal';

import { IconAnnotation, ItemAnnotation } from '../annotations';

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
  name: Schema.String.pipe(
    Schema.annotations({ title: 'Name' }),
    GeneratorAnnotation.set({
      generator: 'company.name',
      probability: 1,
    }),
    Schema.optional,
  ),
  description: Schema.String.pipe(
    Schema.annotations({ title: 'Description' }),
    GeneratorAnnotation.set({
      generator: 'lorem.paragraphs',
      args: [{ min: 1, max: 3 }],
    }),
    Schema.optional,
  ),
  // TODO(wittjosiah): Remove; 1change to relation.
  status: Schema.Literal('prospect', 'qualified', 'active', 'commit', 'reject').pipe(
    FormatAnnotation.set(FormatEnum.SingleSelect),
    GeneratorAnnotation.set({
      generator: 'helpers.arrayElement',
      args: [['prospect', 'qualified', 'active', 'commit', 'reject']],
    }),
    Schema.annotations({
      title: 'Status',
      [PropertyMetaAnnotationId]: {
        singleSelect: {
          options: OrganizationStatusOptions,
        },
      },
    }),
    Schema.optional,
  ),
  // TODO(wittjosiah): Format.URL (currently breaks schema validation). Support ref?
  image: Schema.String.pipe(
    Schema.annotations({ title: 'Image' }),
    GeneratorAnnotation.set('image.url'),
    Schema.optional,
  ),
  // TODO(wittjosiah): Format.URL (currently breaks schema validation).
  website: Schema.String.pipe(
    Schema.annotations({ title: 'Website' }),
    GeneratorAnnotation.set('internet.url'),
    Schema.optional,
  ),
}).pipe(
  Schema.annotations({ title: 'Organization', description: 'An organization.' }),
  LabelAnnotation.set(['name']),
  ItemAnnotation.set(true),
  IconAnnotation.set('ph--building--regular'),
);

export const Organization = OrganizationSchema.pipe(
  Type.Obj({
    typename: 'dxos.org/type/Organization',
    version: '0.1.0',
  }),
);

export interface Organization extends Schema.Schema.Type<typeof Organization> {}
