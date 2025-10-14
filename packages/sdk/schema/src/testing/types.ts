//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Type } from '@dxos/echo';
import { FieldLookupAnnotationId, GeneratorAnnotation, LabelAnnotation } from '@dxos/echo-schema';

import { IconAnnotation } from '../annotations';

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
    Type.Obj({
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
    name: Schema.String.pipe(GeneratorAnnotation.set('company.name')),
    description: Schema.optional(Schema.String),
    image: Schema.optional(
      Type.Format.URL.pipe(Schema.annotations({ title: 'Preview image' }), GeneratorAnnotation.set('image.url')),
    ),
    website: Schema.optional(
      Type.Format.URL.pipe(Schema.annotations({ title: 'Website' }), GeneratorAnnotation.set('internet.url')),
    ),
  }).pipe(
    Schema.annotations({ title: 'Organization' }),
    LabelAnnotation.set(['name']),
    IconAnnotation.set('ph--building--regular'),
  );

  // export type OrgSchemaType = Schema.Schema.Type<typeof OrgSchema>;

  export const Organization = OrganizationSchema.pipe(
    Type.Obj({
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
    name: Schema.String.pipe(GeneratorAnnotation.set('person.fullName')),
    image: Schema.optional(
      Type.Format.URL.pipe(Schema.annotations({ title: 'Preview image' }), GeneratorAnnotation.set('image.url')),
    ),
    email: Schema.optional(Type.Format.Email.pipe(GeneratorAnnotation.set('internet.email'))),
    organization: Schema.optional(
      Type.Ref(Organization).annotations({
        [FieldLookupAnnotationId]: 'name',
      }),
    ),
    // TODO(burdon): This breaks the table view.
    // address: Schema.optional(AddressSchema),
  }).pipe(
    Schema.annotations({ title: 'Contact' }),
    LabelAnnotation.set(['name']),
    IconAnnotation.set('ph--user--regular'),
  );

  // export type ContactSchemaType = Schema.Schema.Type<typeof ContactSchema>;

  export const Contact = ContactSchema.pipe(
    Type.Obj({
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
    name: Schema.String.pipe(GeneratorAnnotation.set('commerce.productName')),
    description: Schema.optional(Schema.String),
    image: Schema.optional(Type.Format.URL.pipe(GeneratorAnnotation.set('image.url'))),
  }).pipe(
    Schema.annotations({ title: 'Project' }),
    LabelAnnotation.set(['name']),
    IconAnnotation.set('ph--kanban--regular'),
  );

  // export type ProjectSchemaType = Schema.Schema.Type<typeof ProjectSchema>;

  export const Project = ProjectSchema.pipe(
    Type.Obj({
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
  }).pipe(Schema.annotations({ title: 'Message' }), LabelAnnotation.set(['name']));

  // export type MessageSchemaType = Schema.Schema.Type<typeof MessageSchema>;

  export const Message = MessageSchema.pipe(
    Type.Obj({
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
