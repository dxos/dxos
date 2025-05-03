//
// Copyright 2025 DXOS.org
//

import { Type } from '@dxos/echo';
import { Format, GeneratorAnnotationId, Ref, S } from '@dxos/echo-schema';

import { Organization } from './organization';
import { PostalAddressSchema } from './postal-address';

// TODO(wittjosiah): Contact vs ContactSchema vs ContactType?

// TODO(burdon): Materialize link for Role (Organization => [Role] => Contact).
// TODO(burdon): Address sub type with geo location.
// TODO(burdon): Reconcile with user id.

// Based on fields from Apple Contacts.
export const ContactSchema = S.Struct({
  fullName: S.optional(S.String.annotations({ [GeneratorAnnotationId]: 'person.fullName' })),
  preferredName: S.optional(S.String),
  nickname: S.optional(S.String),
  // TODO(wittjosiah): Support ref?
  image: S.optional(Format.URL),
  // TODO(burdon): Use reference links.
  organization: S.optional(
    S.Union(S.String, Ref(Organization)).annotations({
      [GeneratorAnnotationId]: 'company.name',
    }),
  ),
  jobTitle: S.optional(S.String),
  department: S.optional(S.String),
  notes: S.optional(S.String),
  // TODO(burdon): Change to array of `handles`.
  emails: S.optional(
    S.mutable(
      S.Array(
        S.Struct({
          label: S.optional(S.String),
          value: Format.Email.annotations({ [GeneratorAnnotationId]: 'internet.email' }),
        }),
      ),
    ),
  ),
  // TODO(burdon): Identities? (socials, DIDs, etc.)
  // TODO(burdon): Add annotations.
  identities: S.optional(
    S.mutable(
      S.Array(
        S.Struct({
          label: S.optional(S.String),
          value: S.String,
        }),
      ),
    ),
  ),
  phoneNumbers: S.optional(
    S.mutable(
      S.Array(
        S.Struct({
          label: S.optional(S.String),
          // TODO(wittjosiah): Format.Phone.
          value: S.String,
        }),
      ),
    ),
  ),
  addresses: S.optional(
    S.mutable(
      S.Array(
        S.Struct({
          label: S.optional(S.String),
          value: PostalAddressSchema,
        }),
      ),
    ),
  ),
  urls: S.optional(
    S.mutable(
      S.Array(
        S.Struct({
          label: S.optional(S.String),
          value: Format.URL.annotations({ [GeneratorAnnotationId]: 'internet.url' }),
        }),
      ),
    ),
  ),
  birthday: S.optional(
    S.mutable(
      S.Struct({
        label: S.String,
        value: S.Date,
      }),
    ),
  ),
  // TODO(burdon): Move to cross-cutting.
  fields: S.optional(
    S.mutable(
      S.Array(
        S.Struct({
          category: S.optional(S.String),
          label: S.String,
          value: S.String,
        }),
      ),
    ),
  ),
});

export const Contact = ContactSchema.pipe(
  Type.def({
    typename: 'dxos.org/type/Contact',
    version: '0.1.0',
  }),
);
export interface Contact extends S.Schema.Type<typeof Contact> {}
