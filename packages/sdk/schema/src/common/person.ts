//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { Format, GeneratorAnnotationId, Ref, S } from '@dxos/echo-schema';

import { Organization } from './organization';
import { PostalAddress } from './postal-address';

// TODO(burdon): Materialize link for Role (Organization => [Role] => Contact).
// TODO(burdon): Address sub type with geo location.
// TODO(burdon): Reconcile with user id.

/**
 * https://schema.org/Person
 * Based on fields from Apple Contacts.
 */
export const PersonSchema = Schema.Struct({
  fullName: Schema.optional(S.String.annotations({ [GeneratorAnnotationId]: 'person.fullName', title: 'Full Name' })),
  preferredName: Schema.optional(S.String.annotations({ title: 'Preferred Name' })),
  nickname: Schema.optional(S.String.annotations({ title: 'Nickname' })),
  // TODO(wittjosiah): Format.URL. Support ref?
  image: Schema.optional(S.String.annotations({ title: 'Image' })),
  // TODO(burdon): Use reference links.
  organization: Schema.optional(Ref(Organization).annotations({ title: 'Organization' })),
  jobTitle: Schema.optional(S.String.annotations({ title: 'Job Title' })),
  department: Schema.optional(S.String.annotations({ title: 'Department' })),
  notes: Schema.optional(S.String.annotations({ title: 'Notes' })),
  // TODO(burdon): Change to array of `handles`.
  emails: Schema.optional(
    Schema.mutable(
      Schema.Array(
        Schema.Struct({
          label: Schema.optional(S.String),
          value: Format.Email.annotations({ [GeneratorAnnotationId]: 'internet.email' }),
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
          label: Schema.optional(S.String),
          value: Schema.String,
        }),
      ),
    ),
  ),
  phoneNumbers: Schema.optional(
    Schema.mutable(
      Schema.Array(
        Schema.Struct({
          label: Schema.optional(S.String),
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
          label: Schema.optional(S.String),
          value: PostalAddress,
        }),
      ),
    ),
  ),
  urls: Schema.optional(
    Schema.mutable(
      Schema.Array(
        Schema.Struct({
          label: Schema.optional(S.String),
          value: Format.URL.annotations({ [GeneratorAnnotationId]: 'internet.url' }),
        }),
      ),
    ),
  ),
  birthday: Schema.optional(S.mutable(S.Date.annotations({ title: 'Birthday' }))),
  // TODO(burdon): Move to base object?
  fields: Schema.optional(
    Schema.mutable(
      Schema.Array(
        Schema.Struct({
          category: Schema.optional(S.String),
          label: Schema.String,
          value: Schema.String,
        }),
      ),
    ),
  ),
});

export const Person = PersonSchema.pipe(
  Type.def({
    typename: 'dxos.org/type/Person',
    version: '0.1.0',
  }),
);

export interface Person extends Schema.Schema.Type<typeof Person> {}
