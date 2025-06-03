//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { Format, GeneratorAnnotationId, LabelAnnotationId } from '@dxos/echo-schema';

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
    Schema.String.annotations({ [GeneratorAnnotationId]: 'person.fullName', title: 'Full Name' }),
  ),
  preferredName: Schema.optional(Schema.String.annotations({ title: 'Preferred Name' })),
  nickname: Schema.optional(Schema.String.annotations({ title: 'Nickname' })),
  // TODO(wittjosiah): Format.URL. Support ref?
  image: Schema.optional(Schema.String.annotations({ title: 'Image' })),
  // TODO(burdon): Use reference links.
  organization: Schema.optional(Type.Ref(Organization).annotations({ title: 'Organization' })),
  jobTitle: Schema.optional(Schema.String.annotations({ title: 'Job Title' })),
  department: Schema.optional(Schema.String.annotations({ title: 'Department' })),
  notes: Schema.optional(Schema.String.annotations({ title: 'Notes' })),
  // TODO(burdon): Change to array of `handles`.
  emails: Schema.optional(
    Schema.mutable(
      Schema.Array(
        Schema.Struct({
          label: Schema.optional(Schema.String),
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
          value: Format.URL.annotations({ [GeneratorAnnotationId]: 'internet.url' }),
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
  Type.def({
    typename: 'dxos.org/type/Person',
    version: '0.1.0',
  }),
).annotations({
  description: 'A person.',
  [LabelAnnotationId]: ['preferredName', 'fullName', 'nickname'],
});

export interface Person extends Schema.Schema.Type<typeof Person> {}
