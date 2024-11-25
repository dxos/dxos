//
// Copyright 2024 DXOS.org
//

import { S, Format, TypedObject } from '@dxos/echo-schema';

import { GeneratorAnnotationId } from './generator';

//
// Org
//

export const Org = S.Struct({
  id: S.String,
  name: S.NonEmptyString.annotations({
    [GeneratorAnnotationId]: 'faker.company.name',
  }),
  website: S.optional(
    Format.URL.annotations({
      [GeneratorAnnotationId]: 'faker.internet.url',
    }),
  ),
});

export class OrgType extends TypedObject({
  typename: 'example.com/type/Org',
  version: '0.1.0',
})(Org.fields) {}

//
// Contact
// TODO(burdon): Array of emails.
// TODO(burdon): Materialize link for Role (Org => [Role] => Contact).
// TODO(burdon): Use with concrete Message type.
// TODO(burdon): Address sub type with geo location.
//

export const Contact = S.Struct({
  id: S.String,
  name: S.NonEmptyString.annotations({
    [GeneratorAnnotationId]: 'faker.person.fullName',
  }),
  email: Format.Email.annotations({
    [GeneratorAnnotationId]: 'faker.internet.email',
  }),
});

export class ContactType extends TypedObject({
  typename: 'example.com/type/Contact',
  version: '0.1.0',
})(Contact.fields) {}

//
// Project
// TODO(burdon): Use with concrete Task type.
//

export const Project = S.Struct({
  id: S.String,
  name: S.String.annotations({
    [GeneratorAnnotationId]: 'faker.commerce.productName',
  }),
});

export class ProjectType extends TypedObject({
  typename: 'example.com/type/Project',
  version: '0.1.0',
})(Project.fields) {}
