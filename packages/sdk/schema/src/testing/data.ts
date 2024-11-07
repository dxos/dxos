//
// Copyright 2024 DXOS.org
//

import {
  AST,
  Format,
  type ReactiveObject,
  S,
  type StoredSchema,
  TypedObject,
  createObjectId,
  createStoredSchema,
  toJsonSchema,
} from '@dxos/echo-schema';

import { createView, type ViewType } from '../types';

export class TestSchema extends TypedObject({
  typename: 'example.com/type/Test',
  version: '0.1.0',
})({
  id: S.String, // TODO(burdon): ID type?
  name: S.optional(S.String.pipe(S.annotations({ [AST.DescriptionAnnotationId]: 'Full name.' }))),
  email: Format.Email.pipe(S.optional),
  address: S.optional(
    S.Struct({
      city: S.optional(S.String),
      zip: S.optional(
        S.String.pipe(
          S.pattern(/^[0-9]{5}(?:-[0-9]{4})?$/),
          S.annotations({
            [AST.DescriptionAnnotationId]: 'ZIP code.',
          }),
        ),
      ),
    }),
  ),
  admin: S.optional(S.Boolean),
  rating: S.optional(S.Number),
}) {}

export type TestType = S.Schema.Type<typeof TestSchema>;

export const testSchema: ReactiveObject<StoredSchema> = createStoredSchema({
  typename: 'example.com/type/Test',
  version: '0.1.0',
  jsonSchema: toJsonSchema(TestSchema),
});

export const testView: ReactiveObject<ViewType> = createView({
  typename: testSchema.typename,
  jsonSchema: toJsonSchema(TestSchema),
});

export const testData: TestType = {
  id: createObjectId(),
  name: 'Tester',
  email: 'test@example.com',
  address: {
    zip: '11205',
  },
};
