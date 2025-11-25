//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Format, Type } from '@dxos/echo';
import { FieldLookupAnnotationId, GeneratorAnnotation, LabelAnnotation } from '@dxos/echo/internal';

import { IconAnnotation } from '../annotations';

/**
 * @deprecated Use (@dxos/echo/testing)
 */
export namespace Testing {
  //
  // Document
  //

  export const DocumentType = Schema.Struct({
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
    name: Schema.String.pipe(GeneratorAnnotation.set('company.name')),
    description: Schema.optional(Schema.String),
    image: Schema.optional(
      Format.URL.pipe(Schema.annotations({ title: 'Preview image' }), GeneratorAnnotation.set('image.url')),
    ),
    website: Schema.optional(
      Format.URL.pipe(Schema.annotations({ title: 'Website' }), GeneratorAnnotation.set('internet.url')),
    ),
  }).pipe(
    Schema.annotations({ title: 'Organization' }),
    LabelAnnotation.set(['name']),
    IconAnnotation.set('ph--building--regular'),
  );

  export const Organization = OrganizationSchema.pipe(
    Type.Obj({
      typename: 'example.com/type/Organization',
      version: '0.1.0',
    }),
  );

  export type Organization = Schema.Schema.Type<typeof Organization>;

  export const AddressSchema = Schema.Struct({
    street: Schema.optional(Schema.String),
    city: Schema.optional(Schema.String),
    state: Schema.optional(Schema.String),
    zip: Schema.optional(Schema.String),
  });

  export const PersonSchema = Schema.Struct({
    name: Schema.String.pipe(GeneratorAnnotation.set('person.fullName')),
    image: Schema.optional(
      Format.URL.pipe(Schema.annotations({ title: 'Preview image' }), GeneratorAnnotation.set('image.url')),
    ),
    email: Schema.optional(Format.Email.pipe(GeneratorAnnotation.set('internet.email'))),
    organization: Schema.optional(
      Type.Ref(Organization).annotations({
        [FieldLookupAnnotationId]: 'name',
      }),
    ),
  }).pipe(
    Schema.annotations({ title: 'Person' }),
    LabelAnnotation.set(['name']),
    IconAnnotation.set('ph--user--regular'),
  );

  export const Person = PersonSchema.pipe(
    Type.Obj({
      typename: 'example.com/type/Person',
      version: '0.1.0',
    }),
  );

  export type Person = Schema.Schema.Type<typeof Person>;

  //
  // Project
  //

  export const ProjectSchema = Schema.Struct({
    name: Schema.String.pipe(GeneratorAnnotation.set('commerce.productName')),
    description: Schema.optional(Schema.String),
    image: Schema.optional(Format.URL.pipe(GeneratorAnnotation.set('image.url'))),
  }).pipe(
    Schema.annotations({ title: 'Project' }),
    LabelAnnotation.set(['name']),
    IconAnnotation.set('ph--kanban--regular'),
  );

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
