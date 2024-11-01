//
// Copyright 2024 DXOS.org
//

import { AST, type JsonPath, S, createObjectId, toJsonSchema } from '@dxos/echo-schema';

import { EmailFormat, type FieldType, FormatAnnotationId, type ViewType } from '../types';

//
// Schema
//

export const TestSchema = S.Struct({
  id: S.String, // TODO(burdon): ID annotation.
  name: S.String.pipe(S.annotations({ [AST.DescriptionAnnotationId]: 'Full name.' })),
  email: S.String.pipe(S.annotations({ [FormatAnnotationId]: EmailFormat })),
  address: S.optional(
    S.Struct({
      city: S.optional(S.String),
      zip: S.String.pipe(
        S.annotations({
          [AST.DescriptionAnnotationId]: 'ZIP code.',
          [FormatAnnotationId]: { filter: /^[0-9]{0,5}(?:-[0-9]{0,4})?$/, valid: /^[0-9]{5}(?:-[0-9]{4})?$/ },
        }),
      ),
    }),
  ),
  admin: S.optional(S.Boolean),
  rating: S.optional(S.Number),
}).pipe(
  S.annotations({
    [AST.DescriptionAnnotationId]: 'Test schema.',
  }),
);

export type TestType = S.Schema.Type<typeof TestSchema>;

//
// Data
//

export const testData: TestType = {
  id: createObjectId(),
  name: 'Tester',
  email: 'test@example.com',
  address: {
    zip: '11205',
  },
};

const fields: FieldType[] = [
  {
    path: 'name' as JsonPath,
  },
  {
    path: 'email' as JsonPath,
  },
  {
    path: 'address.zip' as JsonPath,
  },
  {
    path: 'rating' as JsonPath,
  },
  {
    path: 'admin' as JsonPath,
  },
];

export const testView: ViewType = {
  schema: toJsonSchema(TestSchema),
  query: { __typename: 'example.com/type/Test' },
  fields,
};
