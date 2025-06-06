//
// Copyright 2024 DXOS.org
//

import { Schema, SchemaAST } from 'effect';

import { Format, Type } from '@dxos/echo';
import { TypedObject } from '@dxos/echo-schema';
import { createStoredSchema, type Live } from '@dxos/live-object';

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
  email: Format.Email.pipe(Schema.optional),
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

export const testSchema: Live<Type.StoredType> = createStoredSchema(
  {
    typename: 'example.com/type/Test',
    version: '0.1.0',
  },
  Type.toJsonSchema(TestSchema),
);

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
