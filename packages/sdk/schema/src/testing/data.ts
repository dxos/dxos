//
// Copyright 2024 DXOS.org
//

import { AST, ObjectId, Format, S, type StoredSchema, toJsonSchema, TypedObject } from '@dxos/echo-schema';
import { createStoredSchema, type Live } from '@dxos/live-object';

import { createView, type ViewType } from '../view';

export class TestSchema extends TypedObject({
  typename: 'example.com/type/Test',
  version: '0.1.0',
})({
  id: ObjectId,
  name: S.optional(S.String.pipe(S.annotations({ [AST.DescriptionAnnotationId]: 'Full name.' }))),
  email: Format.Email.pipe(S.optional),
  // TODO(burdon): Define transforms for objects?
  // address: S.optional(
  //   S.Struct({
  //     city: S.optional(S.String),
  //     zip: S.optional(
  //       S.String.pipe(
  //         S.pattern(/^[0-9]{5}(?:-[0-9]{4})?$/),
  //         S.annotations({
  //           [AST.DescriptionAnnotationId]: 'ZIP code.',
  //         }),
  //       ),
  //     ),
  //   }),
  // ),
  admin: S.optional(S.Boolean),
  rating: S.optional(S.Number),
}) {}

export type TestType = S.Schema.Type<typeof TestSchema>;

export const testSchema: Live<StoredSchema> = createStoredSchema(
  {
    typename: 'example.com/type/Test',
    version: '0.1.0',
  },
  toJsonSchema(TestSchema),
);

export const testView: Live<ViewType> = createView({
  name: 'Test',
  typename: testSchema.typename,
  jsonSchema: toJsonSchema(TestSchema),
});

export const testData: TestType = {
  id: ObjectId.random(),
  name: 'Tester',
  email: 'test@example.com',
  // address: {
  //   zip: '11205',
  // },
};
