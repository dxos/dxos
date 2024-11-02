//
// Copyright 2024 DXOS.org
//

import { AST, S, createObjectId, toJsonSchema } from '@dxos/echo-schema';

import { createView, EmailFormat, type FieldType, PatternAnnotationId } from '../types';

//
// Schema
//

export const TestSchema = S.Struct({
  id: S.String, // TODO(burdon): ID annotation.
  name: S.String.pipe(S.annotations({ [AST.DescriptionAnnotationId]: 'Full name.' })),
  email: S.String.pipe(S.annotations({ [PatternAnnotationId]: EmailFormat })),
  address: S.optional(
    S.Struct({
      city: S.optional(S.String),
      zip: S.String.pipe(
        S.annotations({
          [AST.DescriptionAnnotationId]: 'ZIP code.',
          [PatternAnnotationId]: { filter: /^[0-9]{0,5}(?:-[0-9]{0,4})?$/, valid: /^[0-9]{5}(?:-[0-9]{4})?$/ },
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
    property: 'name',
  },
  {
    property: 'email',
  },
  {
    property: 'addressZip',
  },
  {
    property: 'rating',
  },
  {
    property: 'admin',
  },
];

export const testView = createView(toJsonSchema(TestSchema), 'example.com/type/Test');
