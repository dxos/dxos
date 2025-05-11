//
// Copyright 2024 DXOS.org
//

import { SchemaAST as AST, Schema as S } from 'effect';

import { Type } from '@dxos/echo';
import {
  EchoObject,
  FieldLookupAnnotationId,
  Format,
  FormatAnnotation,
  FormatEnum,
  GeneratorAnnotationId,
  LabelAnnotationId,
  ObjectId,
} from '@dxos/echo-schema';

import { IconAnnotationId } from '../annotations';

/**
 * @deprecated
 */
// TODO(wittjosiah): Migrate to using common types.
export namespace Testing {
  //
  // Document
  //

  export const DocumentType = S.Struct({
    id: ObjectId,
    name: S.String,
    content: S.String,
  }).pipe(EchoObject({ typename: 'dxos.org/example/Document', version: '0.1.0' }));

  export type DocumentType = typeof DocumentType.Type;

  //
  // Organization
  //

  export const OrganizationSchema = S.Struct({
    id: Type.ObjectId,
    name: S.String.annotations({
      [GeneratorAnnotationId]: 'company.name',
    }),
    description: S.optional(S.String),
    image: S.optional(
      Format.URL.annotations({
        [AST.TitleAnnotationId]: 'Preview image',
        [GeneratorAnnotationId]: 'image.url',
      }),
    ),
    website: S.optional(
      Format.URL.annotations({
        [AST.TitleAnnotationId]: 'Website',
        [GeneratorAnnotationId]: 'internet.url',
      }),
    ),
  }).annotations({
    [AST.TitleAnnotationId]: 'Organization',
    [LabelAnnotationId]: 'name',
    [IconAnnotationId]: 'ph--building--regular',
  });

  // export type OrgSchemaType = S.Schema.Type<typeof OrgSchema>;

  export const Organization = OrganizationSchema.pipe(
    Type.def({
      typename: 'example.com/type/Organization',
      version: '0.1.0',
    }),
  );
  export type Organization = S.Schema.Type<typeof Organization>;

  //
  // Contact
  // TODO(burdon): Array of email addresses.
  // TODO(burdon): Materialize link for Role (Organization => [Role] => Contact).
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
    id: Type.ObjectId,
    name: S.String.pipe(FormatAnnotation.set(FormatEnum.DateTime)).annotations({
      [GeneratorAnnotationId]: 'person.fullName',
    }),
    image: S.optional(
      Format.URL.annotations({
        [AST.TitleAnnotationId]: 'Preview image',
        [GeneratorAnnotationId]: 'image.url',
      }),
    ),
    email: S.optional(Format.Email.annotations({ [GeneratorAnnotationId]: 'internet.email' })),
    organization: S.optional(
      Type.Ref(Organization).annotations({
        [FieldLookupAnnotationId]: 'name',
      }),
    ),
    // TODO(burdon): This breaks the table view.
    // address: S.optional(AddressSchema),
  }).annotations({
    [AST.TitleAnnotationId]: 'Contact',
    [LabelAnnotationId]: 'name',
    [IconAnnotationId]: 'ph--user--regular',
  });

  // export type ContactSchemaType = S.Schema.Type<typeof ContactSchema>;

  export const Contact = ContactSchema.pipe(
    Type.def({
      typename: 'example.com/type/Contact',
      version: '0.1.0',
    }),
  );
  export type Contact = S.Schema.Type<typeof Contact>;

  //
  // Project
  // TODO(burdon): Use with concrete Task type.
  //

  export const ProjectSchema = S.Struct({
    id: Type.ObjectId,
    name: S.String.annotations({ [GeneratorAnnotationId]: 'commerce.productName' }),
    description: S.optional(S.String),
    image: S.optional(Format.URL.annotations({ [GeneratorAnnotationId]: 'image.url' })),
  }).annotations({
    [AST.TitleAnnotationId]: 'Project',
    [LabelAnnotationId]: 'name',
    [IconAnnotationId]: 'ph--kanban--regular',
  });

  // export type ProjectSchemaType = S.Schema.Type<typeof ProjectSchema>;

  export const Project = ProjectSchema.pipe(
    Type.def({
      typename: 'example.com/type/Project',
      version: '0.1.0',
    }),
  );
  export type Project = S.Schema.Type<typeof Project>;

  //
  // Message
  //

  export const MessageSchema = S.Struct({
    from: S.String,
    created: S.String,
    title: S.String,
    content: S.String,
  }).annotations({
    [AST.TitleAnnotationId]: 'Message',
    [LabelAnnotationId]: 'title',
  });

  // export type MessageSchemaType = S.Schema.Type<typeof MessageSchema>;

  export const Message = MessageSchema.pipe(
    Type.def({
      typename: 'example.com/type/Message',
      version: '0.1.0',
    }),
  );
  export type Message = S.Schema.Type<typeof Message>;

  //
  // Label
  //

  export type Label = {
    name: string;
    color: string;
    description: string;
  };
}
