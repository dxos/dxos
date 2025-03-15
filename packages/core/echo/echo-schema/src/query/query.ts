//
// Copyright 2024 DXOS.org
//

import { Schema as S } from 'effect';

// TODO(ZaymonFC): Where should this live?
const SortDirection = S.Union(S.Literal('asc'), S.Literal('desc'));
export type SortDirectionType = S.Schema.Type<typeof SortDirection>;

// TODO(ZaymonFC): Struct vs pair?
const FieldSort = S.Struct({
  fieldId: S.String,
  direction: SortDirection,
}).pipe(S.mutable);

export interface FieldSortType extends S.Schema.Type<typeof FieldSort> {}

export const FieldSortType: S.Schema<FieldSortType> = FieldSort;

/**
 * ECHO query object.
 */
const QuerySchema = S.Struct({
  typename: S.optional(S.String),
  sort: S.optional(S.Array(FieldSort)),
}).pipe(S.mutable);

export interface QueryType extends S.Schema.Type<typeof QuerySchema> {}

export const QueryType: S.Schema<QueryType> = QuerySchema;
