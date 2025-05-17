//
// Copyright 2024 DXOS.org
//

import { Schema, SchemaAST } from 'effect';

import { Format, Type } from '@dxos/echo';
import { FieldLookupAnnotationId, GeneratorAnnotationId, LabelAnnotationId } from '@dxos/echo-schema';

import { IconAnnotationId } from '../annotations';

/**
 * @deprecated
 */
// TODO(wittjosiah): Migrate to using common types.
export namespace Testing {
  //
  // Document
  //

  export const DocumentType = Schema.Struct({
    id: Type.ObjectId,
    name: Schema.String,
    content: Schema.String,
  }).pipe(
    Type.def({
      typename: 'dxos.org/example/Document',
      version: '0.1.0',
    }),
  );

  export type DocumentType = typeof DocumentType.Type;

  //
  // Organization
  //

  export const OrganizationSchema = Schema.Struct({
    id: Type.ObjectId,
    name: Schema.String.annotations({
      [GeneratorAnnotationId]: 'company.name',
    }),
    description: Schema.optional(Schema.String),
    image: Schema.optional(
      Format.URL.annotations({
        [SchemaAST.TitleAnnotationId]: 'Preview image',
        [GeneratorAnnotationId]: 'image.url',
      }),
    ),
    website: Schema.optional(
      Format.URL.annotations({
        [SchemaAST.TitleAnnotationId]: 'Website',
        [GeneratorAnnotationId]: 'internet.url',
      }),
    ),
  }).annotations({
    [SchemaAST.TitleAnnotationId]: 'Organization',
    [LabelAnnotationId]: 'name',
    [IconAnnotationId]: 'ph--building--regular',
  });

  // export type OrgSchemaType = Schema.Schema.Type<typeof OrgSchema>;

  export const Organization = OrganizationSchema.pipe(
    Type.def({
      typename: 'example.com/type/Organization',
      version: '0.1.0',
    }),
  );
  export type Organization = Schema.Schema.Type<typeof Organization>;

  //
  // Contact
  // TODO(burdon): Array of email addresses.
  // TODO(burdon): Materialize link for Role (Organization => [Role] => Contact).
  // TODO(burdon): Use with concrete Message type.
  // TODO(burdon): Address sub type with geo location.
  // TODO(burdon): Reconcile with user id.
  //

  export const AddressSchema = Schema.Struct({
    street: Schema.optional(Schema.String),
    city: Schema.optional(Schema.String),
    state: Schema.optional(Schema.String),
    zip: Schema.optional(Schema.String),
    // TODO(burdon): Unknown error (handling tuples?)
    // location: Schema.optional(Format.GeoPoint),
    // location: Schema.Tuple(S.Number, Schema.Number),
  });

  export const ContactSchema = Schema.Struct({
    id: Type.ObjectId,
    name: Schema.String.annotations({
      [GeneratorAnnotationId]: 'person.fullName',
    }),
    image: Schema.optional(
      Format.URL.annotations({
        [SchemaAST.TitleAnnotationId]: 'Preview image',
        [GeneratorAnnotationId]: 'image.url',
      }),
    ),
    email: Schema.optional(Format.Email.annotations({ [GeneratorAnnotationId]: 'internet.email' })),
    organization: Schema.optional(
      Type.Ref(Organization).annotations({
        [FieldLookupAnnotationId]: 'name',
      }),
    ),
    // TODO(burdon): This breaks the table view.
    // address: Schema.optional(AddressSchema),
  }).annotations({
    [SchemaAST.TitleAnnotationId]: 'Contact',
    [LabelAnnotationId]: 'name',
    [IconAnnotationId]: 'ph--user--regular',
  });

  // export type ContactSchemaType = Schema.Schema.Type<typeof ContactSchema>;

  export const Contact = ContactSchema.pipe(
    Type.def({
      typename: 'example.com/type/Contact',
      version: '0.1.0',
    }),
  );
  export type Contact = Schema.Schema.Type<typeof Contact>;

  //
  // Project
  // TODO(burdon): Use with concrete Task type.
  //

  export const ProjectSchema = Schema.Struct({
    id: Type.ObjectId,
    name: Schema.String.annotations({ [GeneratorAnnotationId]: 'commerce.productName' }),
    description: Schema.optional(Schema.String),
    image: Schema.optional(Format.URL.annotations({ [GeneratorAnnotationId]: 'image.url' })),
  }).annotations({
    [SchemaAST.TitleAnnotationId]: 'Project',
    [LabelAnnotationId]: 'name',
    [IconAnnotationId]: 'ph--kanban--regular',
  });

  // export type ProjectSchemaType = Schema.Schema.Type<typeof ProjectSchema>;

  export const Project = ProjectSchema.pipe(
    Type.def({
      typename: 'example.com/type/Project',
      version: '0.1.0',
    }),
  );
  export type Project = Schema.Schema.Type<typeof Project>;

  //
  // Message
  //

  export const MessageSchema = Schema.Struct({
    from: Schema.String,
    created: Schema.String,
    title: Schema.String,
    content: Schema.String,
  }).annotations({
    [SchemaAST.TitleAnnotationId]: 'Message',
    [LabelAnnotationId]: 'title',
  });

  // export type MessageSchemaType = Schema.Schema.Type<typeof MessageSchema>;

  export const Message = MessageSchema.pipe(
    Type.def({
      typename: 'example.com/type/Message',
      version: '0.1.0',
    }),
  );
  export type Message = Schema.Schema.Type<typeof Message>;

  //
  // Label
  //

  export type Label = {
    name: string;
    color: string;
    description: string;
  };
}
