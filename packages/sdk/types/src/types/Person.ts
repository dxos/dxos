//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';
import { Format, GeneratorAnnotation, LabelAnnotation, PropertyMeta } from '@dxos/echo/internal';

import * as Geo from './Geo';
import * as Organization from './Organization';

// TODO(burdon): Materialize link for Role (Organization => [Role] => Contact).
// TODO(burdon): Address sub type with geo location.
// TODO(burdon): Reconcile with user id.

/**
 * https://schema.org/Person
 * Based on fields from Apple Contacts.
 */
const PersonSchema = Schema.Struct({
  fullName: Schema.String.pipe(
    Schema.annotations({ title: 'Full Name' }),
    GeneratorAnnotation.set({
      generator: 'person.fullName',
      probability: 1,
    }),
    Schema.optional,
  ),
  preferredName: Schema.String.pipe(Schema.annotations({ title: 'Preferred Name' }), Schema.optional),
  nickname: Schema.String.pipe(Schema.annotations({ title: 'Nickname' }), Schema.optional),
  // TODO(wittjosiah): Format.URL. Support ref?
  image: Schema.String.pipe(Schema.annotations({ title: 'Image' }), Schema.optional),
  // TODO(burdon): Use reference links.
  organization: Type.Ref(Organization.Organization).pipe(
    PropertyMeta('referenceProperty', 'name'),
    Schema.annotations({
      title: 'Employer',
      description: 'Current employer',
    }),
    Schema.optional,
  ),
  jobTitle: Schema.String.pipe(Schema.annotations({ title: 'Job Title' }), Schema.optional),
  department: Schema.String.pipe(Schema.annotations({ title: 'Department' }), Schema.optional),
  notes: Schema.String.pipe(Schema.annotations({ title: 'Notes' }), Schema.optional),
  // TODO(burdon): Change to array of `handles`.
  emails: Schema.Array(
    Schema.Struct({
      label: Schema.optional(Schema.String),
      value: Format.Email.pipe(
        Schema.annotations({ default: 'hello@email.com' }),
        GeneratorAnnotation.set('internet.email'),
      ),
    }),
  ).pipe(Schema.mutable, Schema.optional),
  identities: Schema.Array(
    Schema.Struct({
      label: Schema.optional(Schema.String),
      // TODO(burdon): Identity types? (socials, DIDs, etc.)
      value: Schema.String,
    }),
  ).pipe(Schema.mutable, Schema.optional),
  phoneNumbers: Schema.Array(
    Schema.Struct({
      label: Schema.optional(Schema.String),
      // TODO(wittjosiah): Format.Phone.
      value: Schema.String,
    }),
  )
    .pipe(Schema.mutable, Schema.optional)
    .annotations({ title: 'Phone Numbers' }),
  addresses: Schema.Array(
    Schema.Struct({
      label: Schema.optional(Schema.String),
      value: Geo.PostalAddress,
    }),
  ).pipe(Schema.mutable, Schema.optional),
  urls: Schema.Array(
    Schema.Struct({
      label: Schema.optional(Schema.String),
      value: Format.URL.pipe(
        Schema.annotations({ default: 'https://example.com' }),
        GeneratorAnnotation.set('internet.url'),
      ),
    }),
  ).pipe(Schema.mutable, Schema.optional),
  // TODO(burdon): Support date or create String type for ISO Date.
  birthday: Schema.String.pipe(
    Schema.annotations({ title: 'Birthday' }),
    GeneratorAnnotation.set('date.iso8601'),
    Schema.optional,
  ),
  // TODO(burdon): Move to base object?
  fields: Schema.Array(
    Schema.Struct({
      category: Schema.optional(Schema.String),
      label: Schema.String,
      value: Schema.String,
    }),
  ).pipe(Schema.mutable, Schema.optional),
});

export const Person = PersonSchema.pipe(
  Schema.extend(
    Schema.Struct({
      // TODO(wittjosiah): Reconcile with addresses.
      location: Format.GeoPoint.pipe(Schema.annotations({ title: 'Location' }), Schema.optional),
    }),
  ),
  Type.Obj({
    typename: 'dxos.org/type/Person',
    version: '0.1.0',
  }),
  Schema.annotations({ title: 'Person' }),
  LabelAnnotation.set(['preferredName', 'fullName', 'nickname']),
);

export interface Person extends Schema.Schema.Type<typeof Person> {}

export const make = (props: Partial<Obj.MakeProps<typeof Person>> = {}) => Obj.make(Person, props);

/**
 * @deprecated
 */
export const LegacyPerson = PersonSchema.pipe(
  Type.Obj({
    typename: 'dxos.org/type/Person',
    version: '0.1.0',
  }),
  Schema.annotations({ title: 'Person' }),
  LabelAnnotation.set(['preferredName', 'fullName', 'nickname']),
);
