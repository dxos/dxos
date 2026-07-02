//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Format, Ref, Tag, Type } from '@dxos/echo';

/**
 * Shared test schemas for form stories. Intentionally small, hand-written types
 * (not `@dxos/types`) exercising the range of field renderers: scalars, nested
 * structs, refs, ref arrays, enums, and the various formats.
 */

export class Organization extends Type.makeObject<Organization>(DXN.make('com.example.type.organization', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.minLength(1)).annotations({ title: 'Full name' }),
  }),
) {}

export class Person extends Type.makeObject<Person>(DXN.make('org.dxos.type.person', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.minLength(1)).annotations({ title: 'Full name' }),
    ignore: Schema.String.pipe(Annotation.FormInputAnnotation.set(false), Schema.optional),
    active: Schema.optional(Schema.Boolean.annotations({ title: 'Active' })),
    address: Schema.optional(
      Schema.Struct({
        street: Schema.String,
        city: Schema.String,
        // TODO(burdon): Constrain input control.
        state: Schema.String.pipe(Schema.minLength(2), Schema.maxLength(2)).annotations({
          title: 'State',
          description: 'State code',
        }),
        zip: Schema.Number.annotations({ title: 'ZIP Code' }),
      }).annotations({ title: 'Address' }),
    ),
    employer: Schema.optional(Ref.Ref(Organization).annotations({ title: 'Employer' })),
    tags: Schema.optional(Schema.Array(Ref.Ref(Tag.Tag)).annotations({ title: 'Tags' })),
    status: Schema.optional(Schema.Literal('active', 'inactive').annotations({ title: 'Status' })),
    notes: Schema.optional(Format.Text.annotations({ title: 'Notes' })),
    location: Schema.optional(Format.GeoPoint.annotations({ title: 'Location' })),
    birthday: Schema.optional(Format.DateOnly.annotations({ title: 'Birthday' })),
    meetingAt: Schema.optional(Format.DateTime.annotations({ title: 'Next meeting' })),
    reminderAt: Schema.optional(Format.TimeOnly.annotations({ title: 'Reminder time' })),
    tasks: Schema.optional(Schema.Array(Schema.String).annotations({ title: 'Tasks' })),
    locations: Schema.optional(Schema.Array(Format.GeoPoint).annotations({ title: 'Locations' })),
    identities: Schema.optional(
      Schema.Array(
        Schema.Struct({
          type: Schema.String.annotations({ title: 'Type' }),
          value: Schema.String.annotations({ title: 'Value' }),
        }).annotations({ title: 'Identities' }),
      ).annotations({
        title: 'Identities',
      }),
    ),
  }),
) {}
