//
// Copyright 2024 DXOS.org
//

import {
  S,
  Format,
  TypedObject,
  FieldLookupAnnotationId,
  GeneratorAnnotationId,
  LabelAnnotationId,
  AST,
  Ref,
} from '@dxos/echo-schema';

export namespace Testing {
  //
  // Org
  //

  // TODO(burdon): Fix when id can be defined.
  export const OrgSchema = S.Struct({
    // id: S.String,
    name: S.String.annotations({
      [GeneratorAnnotationId]: 'company.name',
    }),
    website: S.optional(
      Format.URL.annotations({
        [AST.TitleAnnotationId]: 'Website',
        [GeneratorAnnotationId]: 'internet.url',
      }),
    ),
  }).annotations({
    [LabelAnnotationId]: 'name',
  });

  export type OrgSchemaType = S.Schema.Type<typeof OrgSchema>;

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
  // TODO(burdon): Reconcile with user id.
  //

  export const AddressSchema = S.Struct({
    street: S.optional(S.String),
    city: S.optional(S.String),
    state: S.optional(S.String),
    zip: S.optional(S.String),
    // TODO(burdon): Unknown error (handling tuples?)
    // location: S.optional(Format.GeoPoint),
    // location: S.Tuple(S.Number, S.Number),
  });

  export const ContactSchema = S.Struct({
    // id: S.String,
    name: S.String.annotations({
      [GeneratorAnnotationId]: 'person.fullName',
    }),
    email: S.optional(
      Format.Email.annotations({
        [GeneratorAnnotationId]: 'internet.email',
      }),
    ),
    employer: S.optional(
      Ref(OrgType).annotations({
        [FieldLookupAnnotationId]: 'name',
      }),
    ),
    // TODO(burdon): This breaks the table view.
    // address: S.optional(AddressSchema),
  }).annotations({
    [LabelAnnotationId]: ['label', 'name'],
  });

  export type ContactSchemaType = S.Schema.Type<typeof ContactSchema>;

  export class ContactType extends TypedObject({
    typename: 'example.com/type/Contact',
    version: '0.1.0',
  })(ContactSchema.fields) {}

  //
  // Project
  // TODO(burdon): Use with concrete Task type.
  //

  export const ProjectSchema = S.Struct({
    // id: S.String,
    name: S.String.annotations({
      [GeneratorAnnotationId]: 'commerce.productName',
    }),
    description: S.optional(S.String),
  }).annotations({
    [LabelAnnotationId]: 'name',
  });

  export type ProjectSchemaType = S.Schema.Type<typeof ProjectSchema>;

  export class ProjectType extends TypedObject({
    typename: 'example.com/type/Project',
    version: '0.1.0',
  })(ProjectSchema.fields) {}

  //
  // Email
  //

  export const EmailSchema = S.Struct({
    from: S.String,
    to: S.String,
    subject: S.String,
    created: S.String,
    body: S.String,
    category: S.String,
  }).annotations({
    [LabelAnnotationId]: 'subject',
  });

  export type EmailSchemaType = S.Schema.Type<typeof EmailSchema>;

  export class EmailType extends TypedObject({
    typename: 'example.com/type/Email',
    version: '0.1.0',
  })(EmailSchema.fields, { partial: true }) {}

  //
  // Message
  //

  export const MessageSchema = S.Struct({
    from: S.String,
    created: S.String,
    content: S.String,
  }).annotations({
    [LabelAnnotationId]: 'content',
  });

  export type MessageSchemaType = S.Schema.Type<typeof MessageSchema>;

  export class MessageType extends TypedObject({
    typename: 'example.com/type/Message',
    version: '0.1.0',
  })(MessageSchema.fields, { partial: true }) {}
}
