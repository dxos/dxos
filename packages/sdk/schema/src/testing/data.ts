//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Filter, Format, Obj, Query, Type } from '@dxos/echo';

import { StoredSchema, View } from '../types';

/** @deprecated */
// TODO(wittjosiah): Remove.
export const TestSchema = Schema.Struct({
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
}).pipe(
  Type.Obj({
    typename: 'example.com/type/Test',
    version: '0.1.0',
  }),
);

export type TestType = Schema.Schema.Type<typeof TestSchema>;

export const testSchema = Obj.make(StoredSchema, {
  typename: 'example.com/type/Test',
  version: '0.1.0',
  jsonSchema: Type.toJsonSchema(TestSchema),
});

export const testView = View.make({
  name: 'Test',
  query: Query.select(Filter.type(TestSchema)),
  jsonSchema: Type.toJsonSchema(TestSchema),
});

export const testData = Obj.make(TestSchema, {
  id: Obj.ID.random(),
  name: 'Tester',
  email: 'test@example.com',
  // address: {
  //   zip: '11205',
  // },
});
