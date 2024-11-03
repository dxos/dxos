//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';

const QuerySchema = S.Struct({
  __typename: S.String,
});

/**
 * Type of the ECHO query object.
 */
export interface QueryType extends S.Schema.Type<typeof QuerySchema> {}

export const QueryType: S.Schema<QueryType> = QuerySchema;
