//
// Copyright 2025 DXOS.org
//

import { Type } from '@dxos/echo';
import { Format, GeneratorAnnotationId, Ref, type Ref$, S } from '@dxos/echo-schema';

import { Organization } from './organization';
import { PostalAddressSchema } from './postal-address';

// TODO(wittjosiah): Contact vs ContactSchema vs ContactType?

// TODO(burdon): Materialize link for Role (Org => [Role] => Contact).
// TODO(burdon): Address sub type with geo location.
// TODO(burdon): Reconcile with user id.

// Based on fields from Apple Contacts.
export const ContactSchema = S.Struct({
  fullName: S.optional(S.String.annotations({ [GeneratorAnnotationId]: 'person.fullName' })),
  preferredName: S.optional(S.String),
  nickname: S.optional(S.String),
  // TODO(wittjosiah): Support ref?
  image: S.optional(Format.URL),
  organization: S.optional(
    S.Union(S.String, Ref(Organization)).annotations({
      [GeneratorAnnotationId]: 'company.name',
    }),
  ),
  jobTitle: S.optional(S.String),
  department: S.optional(S.String),
  notes: S.optional(S.String),
  emails: S.optional(
    S.mutable(
      S.Struct({
        label: S.String,
        value: Format.Email.annotations({ [GeneratorAnnotationId]: 'internet.email' }),
      }),
    ),
  ),
  phoneNumbers: S.optional(
    S.mutable(
      S.Struct({
        label: S.String,
        // TODO(wittjosiah): Format.Phone.
        value: S.String,
      }),
    ),
  ),
  addresses: S.optional(
    S.mutable(
      S.Struct({
        label: S.String,
        value: PostalAddressSchema,
      }),
    ),
  ),
  socialProfiles: S.optional(
    S.mutable(
      S.Struct({
        label: S.String,
        value: S.String,
      }),
    ),
  ),
  urls: S.optional(
    S.mutable(
      S.Struct({
        label: S.String,
        value: Format.URL.annotations({ [GeneratorAnnotationId]: 'internet.url' }),
      }),
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
  dates: S.optional(
    S.mutable(
      S.Struct({
        label: S.String,
        value: S.Date,
      }),
    ),
  ),
  pronouns: S.optional(
    S.mutable(
      S.Struct({
        label: S.String,
        value: S.String,
      }),
    ),
  ),
  relationships: S.optional(
    S.mutable(
      S.Struct({
        label: S.String,
        value: S.optional(S.suspend((): Ref$<Contact> => Ref(Contact))),
      }),
    ),
  ),
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
