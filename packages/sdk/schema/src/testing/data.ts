//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { type Live, Type } from '@dxos/echo';
import { create, StoredSchema, TypedObject } from '@dxos/echo-schema';

import { createView, type ViewType } from '../view';

export class TestSchema extends TypedObject({
  typename: 'example.com/type/Test',
  version: '0.1.0',
})({
  id: Type.ObjectId,
  name: Schema.optional(
    Schema.String.pipe(
      Schema.annotations({
        description: 'Full name.',
      }),
    ),
  ),
  email: Type.Format.Email.pipe(Schema.optional),
  // TODO(burdon): Define transforms for objects?
  // address: Schema.optional(
  //   Schema.Struct({
  //     city: Schema.optional(S.String),
  //     zip: Schema.optional(
  //       Schema.String.pipe(
  //         Schema.pattern(/^[0-9]{5}(?:-[0-9]{4})?$/),
  //         Schema.annotations({
  //           description: 'ZIP code.',
  //         }),
  //       ),
  //     ),
  //   }),
  // ),
  admin: Schema.optional(Schema.Boolean),
  rating: Schema.optional(Schema.Number),
}) {}

export type TestType = Schema.Schema.Type<typeof TestSchema>;

export const testSchema: Live<StoredSchema> = create(StoredSchema, {
  typename: 'example.com/type/Test',
  version: '0.1.0',
  jsonSchema: Type.toJsonSchema(TestSchema),
});

export const testView: Live<ViewType> = createView({
  name: 'Test',
  typename: testSchema.typename,
  jsonSchema: Type.toJsonSchema(TestSchema),
});

export const testData: TestType = {
  id: Type.ObjectId.random(),
  name: 'Tester',
  email: 'test@example.com',
  // address: {
  //   zip: '11205',
  // },
};
