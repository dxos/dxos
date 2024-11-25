//
// Copyright 2024 DXOS.org
//

import {
  S,
  Format,
  TypedObject,
  type ReactiveObject,
  GeneratorAnnotationId,
  TypeEnum,
  FormatEnum,
  type MutableSchema,
  type JsonPath,
  type JsonProp,
} from '@dxos/echo-schema';

import { ViewProjection } from '../projection';
import { createView, type ViewType } from '../view';

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

/**
 * Create a new field for the relation.
 */
export const createReferenceProperty = (
  schema: MutableSchema,
  property: JsonProp,
  referenceSchema: string,
  referencePath: JsonPath,
) => {
  // TODO(burdon): Remove need for view object.
  const contactView: ReactiveObject<ViewType> = createView({
    name: '',
    typename: schema.typename,
    jsonSchema: schema.jsonSchema,
  });

  // Add relation field.
  const contactProjection = new ViewProjection(schema, contactView);
  // TODO(burdon): Test set before create field.
  const field = contactProjection.createFieldProjection();
  contactProjection.setFieldProjection({
    field,
    props: {
      property,
      type: TypeEnum.Ref,
      format: FormatEnum.Ref,
      referenceSchema,
      referencePath,
    },
  });

  return schema;
};

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
