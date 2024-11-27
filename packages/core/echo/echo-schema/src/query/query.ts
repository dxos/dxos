//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';

/**
 * ECHO query object.
 */
const QuerySchema = S.Struct({
  typename: S.String,
}).pipe(S.mutable);

export interface QueryType extends S.Schema.Type<typeof QuerySchema> {}

export const QueryType: S.Schema<QueryType> = QuerySchema;
