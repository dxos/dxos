//
// Copyright 2024 DXOS.org
//

import { AST, S, generateEchoId } from '@dxos/echo-schema';

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
}).pipe(S.annotations({ [AST.DescriptionAnnotationId]: 'Test schema.' }));

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
    id: generateEchoId(),
    path: 'name',
    type: FieldScalarType.String,
  },
  {
    id: generateEchoId(),
    path: 'email',
    type: FieldScalarType.String,
  },
  {
    id: generateEchoId(),
    path: 'address.zip',
    label: 'ZIP',
    type: FieldScalarType.String,
  },
  {
    id: generateEchoId(),
    path: 'rating',
    type: FieldScalarType.Number,
  },
  {
    id: generateEchoId(),
    path: 'admin',
    type: FieldScalarType.Boolean,
  },
];

export const view: ViewType = {
  query: {
    schema: TestSchema,
  },
  fields,
};
