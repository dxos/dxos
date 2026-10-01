//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { Annotation, DXN, Format, Ref, Tag, Type } from '@dxos/echo';
import { Geo } from '@dxos/types';

/**
 * Shared test schemas for form stories. Intentionally small, hand-written types
 * (not `@dxos/types`) exercising the range of field renderers: scalars, nested
 * structs, refs, ref arrays, enums, and the various formats.
 */

/** Titles an optional string field; `annotate` on the optional itself does not reach the value's AST. */
const titled = (field: Schema.optional<Schema.String>, title: string) =>
  Schema.optional(field.schema.members[0].annotate({ title }));

/** `Geo.PostalAddress` with labels for the keys that read poorly as titles. */
export const PostalAddress = Geo.PostalAddress.mapFields(
  Struct.evolve({
    extended: (field) => titled(field, 'Address line 2'),
    locality: (field) => titled(field, 'City'),
    region: (field) => titled(field, 'State / Region'),
    postalCode: (field) => titled(field, 'Postal code'),
    postOfficeBoxNumber: (field) => titled(field, 'PO box'),
  }),
);

export class Organization extends Type.makeObject<Organization>(DXN.make('com.example.type.organization', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.check(Schema.isMinLength(1))).annotate({ title: 'Full name' }),
  }).pipe(Annotation.UserType.set()),
) {}

export class Person extends Type.makeObject<Person>(DXN.make('org.dxos.type.person', '0.1.0'))(
  Schema.Struct({
    active: Schema.optional(Schema.Boolean.annotate({ title: 'Active' })),
    name: Schema.String.pipe(Schema.check(Schema.isMinLength(1))).annotate({ title: 'Full name' }),
    hidden: Schema.optional(Schema.String.pipe(Annotation.FormInputAnnotation.set(false))), // Don't render.
    address: Schema.optional(PostalAddress.annotate({ title: 'Address' })),
    // A string: ZIP codes keep leading zeros and may carry the +4 suffix.
    zip: Schema.optional(
      Schema.String.pipe(Schema.check(Schema.isPattern(/^\d{5}(-\d{4})?$/))).annotate({
        title: 'ZIP Code',
        description: 'Five digits, optionally followed by a dash and four more.',
      }),
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
  }).pipe(Annotation.UserType.set()),
) {}
