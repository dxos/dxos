//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { Format, GeneratorAnnotation, LabelAnnotation, PropertyMeta } from '@dxos/echo-schema';

import { Organization } from './organization';
import { PostalAddress } from './postal-address';

// TODO(burdon): Materialize link for Role (Organization => [Role] => Contact).
// TODO(burdon): Address sub type with geo location.
// TODO(burdon): Reconcile with user id.

/**
 * https://schema.org/Person
 * Based on fields from Apple Contacts.
 */
const PersonSchema = Schema.Struct({
  fullName: Schema.optional(
    Schema.String.pipe(Schema.annotations({ title: 'Full Name' }), GeneratorAnnotation.set(['person.fullName', 1])),
  ),
  preferredName: Schema.optional(Schema.String.annotations({ title: 'Preferred Name' })),
  nickname: Schema.optional(Schema.String.annotations({ title: 'Nickname' })),
  // TODO(wittjosiah): Format.URL. Support ref?
  image: Schema.optional(Schema.String.annotations({ title: 'Image' })),
  // TODO(burdon): Use reference links.
  organization: Schema.optional(
    Type.Ref(Organization).pipe(PropertyMeta('referenceProperty', 'name')).annotations({ title: 'Organization' }),
  ),
  jobTitle: Schema.optional(Schema.String.annotations({ title: 'Job Title' })),
  department: Schema.optional(Schema.String.annotations({ title: 'Department' })),
  notes: Schema.optional(Schema.String.annotations({ title: 'Notes' })),
  // TODO(burdon): Change to array of `handles`.
  emails: Schema.optional(
    Schema.mutable(
      Schema.Array(
        Schema.Struct({
          label: Schema.optional(Schema.String),
          value: Format.Email.pipe(GeneratorAnnotation.set('internet.email')),
        }),
      ),
    ),
  ),
  // TODO(burdon): Identities? (socials, DIDs, etc.)
  // TODO(burdon): Add annotations.
  // TODO(burdon): Record or array (for CRDT)?
  identities: Schema.optional(
    Schema.mutable(
      Schema.Array(
        Schema.Struct({
          label: Schema.optional(Schema.String),
          value: Schema.String,
        }),
      ),
    ),
  ),
  phoneNumbers: Schema.optional(
    Schema.mutable(
      Schema.Array(
        Schema.Struct({
          label: Schema.optional(Schema.String),
          // TODO(wittjosiah): Format.Phone.
          value: Schema.String,
        }),
      ),
    ),
  ),
  addresses: Schema.optional(
    Schema.mutable(
      Schema.Array(
        Schema.Struct({
          label: Schema.optional(Schema.String),
          value: PostalAddress,
        }),
      ),
    ),
  ),
  urls: Schema.optional(
    Schema.mutable(
      Schema.Array(
        Schema.Struct({
          label: Schema.optional(Schema.String),
          value: Format.URL.pipe(GeneratorAnnotation.set('internet.url')),
        }),
      ),
    ),
  ),
  // TODO(burdon): Support date or create String type for ISO Date.
  birthday: Schema.optional(Schema.mutable(Schema.String.annotations({ title: 'Birthday' }))),
  // TODO(burdon): Move to base object?
  fields: Schema.optional(
    Schema.mutable(
      Schema.Array(
        Schema.Struct({
          category: Schema.optional(Schema.String),
          label: Schema.String,
          value: Schema.String,
        }),
      ),
    ),
  ),
});

export const Person = PersonSchema.pipe(
  Type.Obj({
    typename: 'dxos.org/type/Person',
    version: '0.1.0',
  }),
).pipe(
  Schema.annotations({ title: 'Person', description: 'A person.' }),
  LabelAnnotation.set(['preferredName', 'fullName', 'nickname']),
);

export interface Person extends Schema.Schema.Type<typeof Person> {}
