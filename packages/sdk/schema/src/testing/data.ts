//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Filter, Format, JsonSchema, Query, Type, type View } from '@dxos/echo';

import { ViewModel } from '../types';

/**
 * @deprecated Use (@dxos/echo/testing)
 */
// TODO(burdon): REMOVE
export class Example extends Type.makeObject<Example>(DXN.make('com.example.type.example', '0.1.0'))(
  Schema.Struct({
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
  }),
) {}

export const testSchema = Type.makeObjectFromJsonSchema({
  typename: 'com.example.type.test',
  version: '0.1.0',
  jsonSchema: JsonSchema.toJsonSchema(Type.getSchema(Example)),
});

export const testView: View.View = ViewModel.make({
  name: 'Test',
  query: Query.select(Filter.type(Example)),
  jsonSchema: JsonSchema.toJsonSchema(Example),
});
