//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Format, Ref, Type } from '@dxos/echo';

/**
 * @deprecated Use (@dxos/echo/testing)
 */
// TODO(burdon): REMOVE
export namespace TestSchema {
  //
  // Document
  //

  export class DocumentType extends Type.makeObject<DocumentType>(DXN.make('org.dxos.example.document', '0.1.0'))(
    Schema.Struct({
      name: Schema.String,
      content: Schema.String,
    }).pipe(Annotation.UserType.set()),
  ) {}

  //
  // Organization
  //

  export const OrganizationSchema = Schema.Struct({
    name: Schema.String.pipe(Annotation.GeneratorAnnotation.set('company.name')),
    description: Schema.optional(Schema.String),
    image: Schema.optional(
      Format.URL.pipe(Schema.annotate({ title: 'Preview image' }), Annotation.GeneratorAnnotation.set('image.url')),
    ),
    website: Schema.optional(
      Format.URL.pipe(Schema.annotate({ title: 'Website' }), Annotation.GeneratorAnnotation.set('internet.url')),
    ),
  }).pipe(
    Schema.annotate({ title: 'Organization' }),
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--building--regular', hue: 'blue' }),
  );

  export const Organization = Type.makeObject(DXN.make('com.example.type.organization', '0.1.0'))(
    OrganizationSchema.pipe(Annotation.UserType.set()),
  );

  export type Organization = Schema.Schema.Type<typeof Organization>;

  export const AddressSchema = Schema.Struct({
    street: Schema.optional(Schema.String),
    city: Schema.optional(Schema.String),
    state: Schema.optional(Schema.String),
    zip: Schema.optional(Schema.String),
  });

  export const PersonSchema = Schema.Struct({
    name: Schema.String.pipe(Annotation.GeneratorAnnotation.set('person.fullName')),
    image: Schema.optional(
      Format.URL.pipe(Schema.annotate({ title: 'Preview image' }), Annotation.GeneratorAnnotation.set('image.url')),
    ),
    email: Schema.optional(Format.Email.pipe(Annotation.GeneratorAnnotation.set('internet.email'))),
    organization: Schema.optional(
      Ref.Ref(Organization).annotate({
        [Annotation.FieldLookupAnnotationId]: 'name',
      }),
    ),
  }).pipe(
    Schema.annotate({ title: 'Person' }),
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--user--regular', hue: 'green' }),
  );

  export const Person = Type.makeObject(DXN.make('com.example.type.person', '0.1.0'))(
    PersonSchema.pipe(Annotation.UserType.set()),
  );

  export type Person = Schema.Schema.Type<typeof Person>;

  //
  // Project
  //

  export const ProjectSchema = Schema.Struct({
    name: Schema.String.pipe(Annotation.GeneratorAnnotation.set('commerce.productName')),
    description: Schema.optional(Schema.String),
    image: Schema.optional(Format.URL.pipe(Annotation.GeneratorAnnotation.set('image.url'))),
  }).pipe(
    Schema.annotate({ title: 'Project' }),
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--kanban--regular', hue: 'purple' }),
  );

  export const Project = Type.makeObject(DXN.make('com.example.type.project', '0.1.0'))(
    ProjectSchema.pipe(Annotation.UserType.set()),
  );

  export type Pipeline = Schema.Schema.Type<typeof Project>;

  //
  // Message
  //

  export const MessageSchema = Schema.Struct({
    from: Schema.String,
    created: Schema.String,
    title: Schema.String,
    content: Schema.String,
  }).pipe(Schema.annotate({ title: 'Message' }), Annotation.LabelAnnotation.set(['name']));

  export const Message = Type.makeObject(DXN.make('com.example.type.message', '0.1.0'))(
    MessageSchema.pipe(Annotation.UserType.set()),
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
