//
// Copyright 2024 DXOS.org
//

import { AST, S } from '@dxos/echo-schema';

import { type TableType } from './types';

export const TestSchema = S.Struct({
  name: S.String.pipe(S.annotations({ [AST.DescriptionAnnotationId]: 'Full name.' })),
  email: S.String,
  address: S.optional(
    S.Struct({
      zip: S.String.pipe(S.annotations({ [AST.DescriptionAnnotationId]: 'ZIP code.' })),
    }),
  ),
});

export type TestType = S.Schema.Type<typeof TestSchema>;

export const data: TestType = {
  name: 'Tester',
  email: 'test@example.com',
  address: {
    zip: '11205',
  },
};

export const table: TableType = {
  schema: TestSchema,
  columns: [
    {
      path: 'name',
    },
    {
      path: 'email',
    },
    {
      path: 'address.zip',
      label: 'ZIP',
    },
  ],
};
