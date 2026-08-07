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
    name: Schema.String.pipe(Schema.check(Schema.isMinLength(1))).annotate({ title: 'Full name' }),
  }),
) {}

export class Person extends Type.makeObject<Person>(DXN.make('org.dxos.type.person', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.check(Schema.isMinLength(1))).annotate({ title: 'Full name' }),
    ignore: Schema.String.pipe(Annotation.FormInputAnnotation.set(false), Schema.optional),
    active: Schema.optional(Schema.Boolean.annotate({ title: 'Active' })),
    address: Schema.optional(
      Schema.Struct({
        street: Schema.String,
        city: Schema.String,
        // TODO(burdon): Constrain input control.
        state: Schema.String.pipe(Schema.check(Schema.isMinLength(2)), Schema.check(Schema.isMaxLength(2))).annotate({
          title: 'State',
          description: 'State code',
        }),
        zip: Schema.Number.annotate({ title: 'ZIP Code' }),
      }).annotate({ title: 'Address' }),
    ),
    employer: Schema.optional(Ref.Ref(Organization).annotate({ title: 'Employer' })),
    tags: Schema.optional(Schema.Array(Ref.Ref(Tag.Tag)).annotate({ title: 'Tags' })),
    status: Schema.optional(Schema.Literals(['active', 'inactive']).annotate({ title: 'Status' })),
    notes: Schema.optional(Format.Text.annotate({ title: 'Notes' })),
    location: Schema.optional(Format.GeoPoint.annotate({ title: 'Location' })),
    birthday: Schema.optional(Format.DateOnly.annotate({ title: 'Birthday' })),
    meetingAt: Schema.optional(Format.DateTime.annotate({ title: 'Next meeting' })),
    reminderAt: Schema.optional(Format.TimeOnly.annotate({ title: 'Reminder time' })),
    tasks: Schema.optional(Schema.Array(Schema.String).annotate({ title: 'Tasks' })),
    locations: Schema.optional(Schema.Array(Format.GeoPoint).annotate({ title: 'Locations' })),
    identities: Schema.optional(
      Schema.Array(
        Schema.Struct({
          type: Schema.String.annotate({ title: 'Type' }),
          value: Schema.String.annotate({ title: 'Value' }),
        }).annotate({ title: 'Identities' }),
      ).annotate({
        title: 'Identities',
      }),
    ),
  }),
) {}
