//
// Copyright 2024 DXOS.org
//

import { AST, S } from '@dxos/echo-schema';

import { EmailFormat, FormatAnnotationId, FieldScalarType, type ViewType } from '../types';

export const TestSchema = S.Struct({
  name: S.String.pipe(S.annotations({ [AST.DescriptionAnnotationId]: 'Full name.' })),
  email: S.String.pipe(S.annotations({ [FormatAnnotationId]: EmailFormat })),
  address: S.optional(
    S.Struct({
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
});

export type TestType = S.Schema.Type<typeof TestSchema>;

export const data: TestType = {
  name: 'Tester',
  email: 'test@example.com',
  address: {
    zip: '11205',
  },
};

const fields = [
  {
    path: 'name',
    type: FieldScalarType.String,
  },
  {
    path: 'email',
    type: FieldScalarType.String,
  },
  {
    path: 'address.zip',
    label: 'ZIP',
    type: FieldScalarType.String,
  },
  {
    path: 'rating',
    type: FieldScalarType.Number,
  },
  {
    path: 'admin',
    type: FieldScalarType.Boolean,
  },
];

export const view: ViewType = {
  schema: TestSchema,
  fields,
};
