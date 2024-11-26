//
// Copyright 2024 DXOS.org
//

import { S, Format, TypedObject, FieldLookupAnnotationId, GeneratorAnnotationId, AST, ref } from '@dxos/echo-schema';

export namespace Test {
  //
  // Org
  //

  export const OrgSchema = S.Struct({
    id: S.String,
    name: S.NonEmptyString.annotations({
      [GeneratorAnnotationId]: 'company.name',
    }),
    website: S.optional(
      Format.URL.annotations({
        [AST.TitleAnnotationId]: 'Website',
        [GeneratorAnnotationId]: 'internet.url',
      }),
    ),
  });

  export class OrgType extends TypedObject({
    typename: 'example.com/type/Org',
    version: '0.1.0',
  })(OrgSchema.fields) {}

  //
  // Contact
  // TODO(burdon): Array of emails.
  // TODO(burdon): Materialize link for Role (Org => [Role] => Contact).
  // TODO(burdon): Use with concrete Message type.
  // TODO(burdon): Address sub type with geo location.
  //

  export const AddressSchema = S.Struct({
    street: S.String,
    city: S.String,
    state: S.String,
    zip: S.String,
    location: Format.GeoPoint,
  });

  export const ContactSchema = S.Struct({
    id: S.String,
    name: S.NonEmptyString.annotations({
      [GeneratorAnnotationId]: 'person.fullName',
    }),
    email: Format.Email.annotations({
      [GeneratorAnnotationId]: 'internet.email',
    }),
    employer: S.optional(
      ref(OrgType).annotations({
        [FieldLookupAnnotationId]: 'name',
      }),
    ),
  });

  export class ContactType extends TypedObject({
    typename: 'example.com/type/Contact',
    version: '0.1.0',
  })(ContactSchema.fields) {}

  //
  // Project
  // TODO(burdon): Use with concrete Task type.
  //

  export const ProjectSchema = S.Struct({
    id: S.String,
    name: S.String.annotations({
      [GeneratorAnnotationId]: 'commerce.productName',
    }),
  });

  export class ProjectType extends TypedObject({
    typename: 'example.com/type/Project',
    version: '0.1.0',
  })(ProjectSchema.fields) {}
}
