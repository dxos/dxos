//
// Copyright 2024 DXOS.org
//

import { AST, S, createObjectId } from '@dxos/echo-schema';

import { EmailFormat, FormatAnnotationId, FieldValueType, type ViewType } from '../types';

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

const fields = [
  {
    path: 'name',
    type: FieldValueType.String,
  },
  {
    path: 'email',
    type: FieldValueType.String,
  },
  {
    path: 'address.zip',
    label: 'ZIP',
    type: FieldValueType.String,
  },
  {
    path: 'rating',
    type: FieldValueType.Number,
  },
  {
    path: 'admin',
    type: FieldValueType.Boolean,
  },
];

export const testView: ViewType = {
  query: { __typename: 'example.com/schema/TestSchema' },
  fields,
};
