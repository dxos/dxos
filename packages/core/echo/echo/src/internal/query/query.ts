//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

// TODO(ZaymonFC): Where should this live?
const SortDirection = Schema.Union(Schema.Literal('asc'), Schema.Literal('desc'));
export type SortDirectionType = Schema.Schema.Type<typeof SortDirection>;

// TODO(ZaymonFC): Struct vs pair?
const FieldSort = Schema.Struct({
  fieldId: Schema.String,
  direction: SortDirection,
}).pipe(Schema.mutable);

export interface FieldSortType extends Schema.Schema.Type<typeof FieldSort> {}

export const FieldSortType: Schema.Schema<FieldSortType> = FieldSort;

/**
 * ECHO query object.
 */
const QuerySchema = Schema.Struct({
  typename: Schema.optional(Schema.String),
  sort: Schema.optional(Schema.Array(FieldSort)),
}).pipe(Schema.mutable);

export interface QueryType extends Schema.Schema.Type<typeof QuerySchema> {}

export const QueryType: Schema.Schema<QueryType> = QuerySchema;
