//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Format, Obj, Type } from '@dxos/echo';
import { GeneratorAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { FormatAnnotation } from '@dxos/echo/Format';
import { PropertyMetaAnnotationId } from '@dxos/echo/internal';

// TODO(burdon): Remove (specific to kanban demo).
export const StatusOptions = [
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
  name: Schema.String.pipe(
    Schema.annotations({ title: 'Name' }),
    GeneratorAnnotation.set({
      generator: 'company.name',
      probability: 1,
    }),
    Annotation.RdfPredicate.set('https://schema.org/name'),
    Schema.optional,
  ),
  description: Schema.String.pipe(
    Schema.annotations({ title: 'Description' }),
    GeneratorAnnotation.set({
      generator: 'lorem.paragraphs',
      args: [{ min: 1, max: 3 }],
    }),
    Annotation.RdfPredicate.set('https://schema.org/description'),
    Schema.optional,
  ),
  // TODO(wittjosiah): Remove (change to relation).
  status: Schema.Literal('prospect', 'qualified', 'active', 'commit', 'reject').pipe(
    FormatAnnotation.set(Format.TypeFormat.SingleSelect),
    GeneratorAnnotation.set({
      generator: 'helpers.arrayElement',
      args: [['prospect', 'qualified', 'active', 'commit', 'reject']],
    }),
    Schema.annotations({
      title: 'Status',
      [PropertyMetaAnnotationId]: {
        singleSelect: {
          options: StatusOptions,
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
  website: Format.URL.pipe(
    Schema.annotations({ title: 'Website' }),
    GeneratorAnnotation.set('internet.url'),
    Annotation.RdfPredicate.set('https://schema.org/url'),
    Schema.optional,
  ),
});

const _OrganizationSchema = OrganizationSchema.pipe(
  Schema.extend(
    Schema.Struct({
      location: Format.GeoPoint.pipe(Schema.annotations({ title: 'Location' }), Schema.optional),
    }),
  ),
  Schema.annotations({ title: 'Organization', description: 'An organization.' }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({ icon: 'ph--building-office--regular', hue: 'neutral' }),
);

export class Organization extends Type.makeObject<Organization>(DXN.make('org.dxos.type.organization', '0.1.0'))(
  _OrganizationSchema,
) {}

export const make = (props: Partial<Obj.MakeProps<typeof Organization>> = {}) => Obj.make(Organization, props);

const _LegacyOrganizationSchema = OrganizationSchema.pipe(
  Schema.annotations({ title: 'Organization', description: 'An organization.' }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({ icon: 'ph--building-office--regular', hue: 'neutral' }),
);

// TODO(wittjosiah): Remove to move location into base schema.
//   GeoPoint format currently breaks Anthropic schema validation.
export const LegacyOrganization = Type.makeObject(DXN.make('org.dxos.type.organization', '0.1.0'))(
  _LegacyOrganizationSchema,
);
