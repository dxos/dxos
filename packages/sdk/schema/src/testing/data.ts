//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Filter, Format, Obj, Query, Type } from '@dxos/echo';
import { TypedObject } from '@dxos/echo/internal';

import { View } from '../types';

/**
 * @deprecated Use (@dxos/echo/testing)
 */
// TODO(burdon): REMOVE
export class Example extends TypedObject({
  typename: 'example.com/type/Example',
  version: '0.1.0',
})({
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

export type TestType = Schema.Schema.Type<typeof Example>;

export const testSchema: Type.PersistentType = Obj.make(Type.PersistentType, {
  typename: 'example.com/type/Test',
  version: '0.1.0',
  jsonSchema: Type.toJsonSchema(Example),
});

export const testView: View.View = View.make({
  name: 'Test',
  query: Query.select(Filter.type(Example)),
  jsonSchema: Type.toJsonSchema(Example),
});

export const testData: TestType = {
  id: Obj.ID.random(),
  name: 'Tester',
  email: 'test@example.com',
  // address: {
  //   zip: '11205',
  // },
};
