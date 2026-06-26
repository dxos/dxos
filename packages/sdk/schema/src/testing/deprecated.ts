//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Format, Ref, Type } from '@dxos/echo';
import { FieldLookupAnnotationId, GeneratorAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';

/**
 * @deprecated Use (@dxos/echo/testing)
 */
// TODO(burdon): REMOVE
export namespace TestSchema {
  //
  // Document
  //

  export class DocumentType extends Type.makeObject<DocumentType>(DXN.make('org.dxos.example.document', '0.1.0'))(Schema.Struct({
    name: Schema.String,
    content: Schema.String,
  })) {}

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
    Annotation.IconAnnotation.set({ icon: 'ph--building--regular', hue: 'blue' }),
  );

  export const Organization = Type.makeObject(DXN.make('com.example.type.organization', '0.1.0'))(OrganizationSchema);

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
      Ref.Ref(Organization).annotations({
        [FieldLookupAnnotationId]: 'name',
      }),
    ),
  }).pipe(
    Schema.annotations({ title: 'Person' }),
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--user--regular', hue: 'green' }),
  );

  export const Person = Type.makeObject(DXN.make('com.example.type.person', '0.1.0'))(PersonSchema);

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
    Annotation.IconAnnotation.set({ icon: 'ph--kanban--regular', hue: 'purple' }),
  );

  export const Project = Type.makeObject(DXN.make('com.example.type.project', '0.1.0'))(ProjectSchema);

  export type Pipeline = Schema.Schema.Type<typeof Project>;

  //
  // Message
  //

  export const MessageSchema = Schema.Struct({
    from: Schema.String,
    created: Schema.String,
    title: Schema.String,
    content: Schema.String,
  }).pipe(Schema.annotations({ title: 'Message' }), LabelAnnotation.set(['name']));

  export const Message = Type.makeObject(DXN.make('com.example.type.message', '0.1.0'))(MessageSchema);

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
