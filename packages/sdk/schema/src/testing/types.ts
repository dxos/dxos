//
// Copyright 2024 DXOS.org
//

import { S, Format, TypedObject } from '@dxos/echo-schema';

import { GeneratorAnnotationId } from './generator';

//
// Org
//

export const Org = S.Struct({
  // id: S.String,
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
//

export const Contact = S.Struct({
  // id: S.String,
  name: S.NonEmptyString.annotations({
    [GeneratorAnnotationId]: 'faker.person.fullName',
  }),
  // TODO(burdon): Array.
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
//

export const Project = S.Struct({
  // id: S.String,
  name: S.String.annotations({
    [GeneratorAnnotationId]: 'faker.commerce.productName',
  }),
});

export class ProjectType extends TypedObject({
  typename: 'example.com/type/Project',
  version: '0.1.0',
})(Project.fields) {}

//
//
//

// TODO(burdon): Use concrete type.
export const Task = S.Struct({
  // id: S.String,
  // project: S.optional(ref(Project)), // TODO(burdon): Must be echo object.
  name: S.String,
  assignedTo: S.String, // TODO(burdon): Ref.
});

// TODO(burdon): Use concrete type.
export const Message = S.Struct({
  // id: S.String,
  from: Format.Email,
  to: Format.Email,
  subject: S.String,
  body: S.String,
});
