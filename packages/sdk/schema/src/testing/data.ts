//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Filter, Format, JsonSchema, Obj, Query, Type, type View } from '@dxos/echo';

import { ViewModel } from '../types';

/**
 * @deprecated Use (@dxos/echo/testing)
 */
// TODO(burdon): REMOVE
export const Example = Schema.Struct({
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
  Type.object({
    typename: 'com.example.type.example',
    version: '0.1.0',
  }),
);

export type Example = Schema.Schema.Type<typeof Example>;

export const testSchema = Obj.make(Type.PersistentType, {
  typename: 'com.example.type.test',
  version: '0.1.0',
  jsonSchema: JsonSchema.toJsonSchema(Example),
});

export const testView: View.View = ViewModel.make({
  name: 'Test',
  query: Query.select(Filter.type(Example)),
  jsonSchema: JsonSchema.toJsonSchema(Example),
});
