//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';

// TODO(ZaymonFC): Where should this live?
const SortDirection = S.Union(S.Literal('asc'), S.Literal('desc'));
export type SortDirectionType = S.Schema.Type<typeof SortDirection>;

// TODO(ZaymonFC): Struct vs pair?
const FieldSort = S.Struct({
  fieldId: S.String,
  direction: SortDirection,
}).pipe(S.mutable);

export interface FieldSortType extends S.Schema.Type<typeof FieldSort> {}

/**
 * ECHO query object.
 */
const QuerySchema = S.Struct({
  // TODO(burdon): Rename to typename.
  // typename: S.String,
  type: S.optional(S.String),
  sort: S.optional(S.Array(FieldSort)),

  // TODO(ZaymonFC): Maybe this shouldn't be optional?
  //   Not sure how to migrate old views.
  metadata: S.optional(S.Record({ key: S.String, value: S.Any }).pipe(S.mutable)),
}).pipe(S.mutable);

export interface QueryType extends S.Schema.Type<typeof QuerySchema> {}

export const QueryType: S.Schema<QueryType> = QuerySchema;
