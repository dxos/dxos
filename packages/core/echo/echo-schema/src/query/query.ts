//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';
import { ObjectIdSchema, SpaceIdSchema } from '../types';

//
// Inspired by filter.proto.
//

const DXNSchema = S.String.pipe(S.pattern(/^dxn:/));

// TODO(dmaretskyi): Consider moving this to echo protocol.

/**
 * ECHO query object.
 */
const FilterSchema = S.Struct({
  /**
   * Matches object type.
   */
  type: S.optional(S.Array(DXNSchema)),

  /**
   * Matches specific object id.
   */
  objectId: S.optional(S.Array(ObjectIdSchema)),

  // TODO(dmaretskyi): How do we handle matching nested properties?
  /*
  For example if we want to match `address.city`,
  would it be: `{ address: { city: 'Bangkok' } }` or `{ 'address.city': 'Bangkok' }`?

  The second one is ambiguous because it could be a nested object or a string key.
  The first one is not clear on whether it allows extra properties in the `address` object.

  */
  properties: S.optional(S.Record({ key: S.String, value: S.Any })),

  /**
   * Full text search.
   */
  text: S.optional(S.String),

  /**
   * This filter should be negated.
   */
  not: S.optional(S.Boolean),

  /**
   * All additional filters that should be satisfied for this filter to pass.
   * Additionally any criteria defined in this filter (e.g. `type`, `properties`) are also required to be satisfied.
   */
  and: S.optional(S.Array(S.suspend((): S.Schema<FilterType> => FilterSchema))),

  /**
   * Any of the additional filters should be satisfied for this filter to pass.
   * Additionally any criteria defined in this filter (e.g. `type`, `properties`) are also required to be satisfied.
   */
  or: S.optional(S.Array(S.suspend((): S.Schema<FilterType> => FilterSchema))),
});

interface FilterType extends S.Schema.Type<typeof FilterSchema> {}

/**
 * Defines the result format of the query.
 */
export enum ResultFormat {
  /**
   * Plain javascript objects.
   * No live updates.
   */
  Plain = 'plain',

  /**
   * Live objects that update automatically with mutations in the database.
   * Support signal notifications.
   */
  Live = 'live',

  /**
   * Direct access to the automerge document.
   */
  AutomergeDocAccessor = 'automergeDocAccessor',
}

const ResultFormatSchema = S.Enums(ResultFormat);

const ResultOptionsSchema = S.Struct({
  /**
   * Format of the output data.
   * Not every query engine supports all formats.
   */
  format: S.optional(ResultFormatSchema),

  /**
   * Eagerly load data from objects referenced by the references set in those specific properties.
   *
   * @example `{ org: true }` - loads data from the reference in the `org` property.
   * @example `{ org: { manager: true } }` - recursively loads data from `org` reference and then from the `manager` reference.
   */
  shape: S.optional(S.Record({ key: S.String, value: S.Any })),
});

const QuerySchema = S.Struct({
  /**
   * Space to query.
   */
  spaces: S.optional(S.Array(SpaceIdSchema)),

  /**
   * Query filter.
   */
  filter: FilterSchema,

  /**
   * Result formatting options.
   */
  result: S.optional(ResultOptionsSchema),
}).pipe(S.mutable);

export interface QueryType extends S.Schema.Type<typeof QuerySchema> {}

export const QueryType: S.Schema<QueryType> = QuerySchema;
