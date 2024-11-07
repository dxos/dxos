//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';

/**
 * ECHO query object.
 */
const QuerySchema = S.Struct({
  // TODO(burdon): Why underscore?
  __typename: S.String,
});

export interface QueryType extends S.Schema.Type<typeof QuerySchema> {}

export const QueryType: S.Schema<QueryType> = QuerySchema;
