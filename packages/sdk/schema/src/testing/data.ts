//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Filter, type Live, Obj, Query, Type } from '@dxos/echo';
import { TypedObject } from '@dxos/echo/internal';

import { DataType } from '../common';
import { createView } from '../view';

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

export const testSchema: Live<DataType.StoredSchema> = Obj.make(DataType.StoredSchema, {
  typename: 'example.com/type/Test',
  version: '0.1.0',
  jsonSchema: Type.toJsonSchema(TestSchema),
});

export const testView: Live<DataType.View> = createView({
  name: 'Test',
  query: Query.select(Filter.type(TestSchema)),
  jsonSchema: Type.toJsonSchema(TestSchema),
  presentation: Obj.make(Type.Expando, {}),
});

export const testData: TestType = {
  id: Type.ObjectId.random(),
  name: 'Tester',
  email: 'test@example.com',
  // address: {
  //   zip: '11205',
  // },
};
