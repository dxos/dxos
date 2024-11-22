//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';
import { DXNStringSchema, ObjectIdSchema, SpaceIdSchema } from '../types';

//
// Inspired by filter.proto.
//

/**
 * ECHO query object.
 * All predicates are combined with logical `AND`.
 */
const FilterSchema = S.Struct({
  /**
   * Matches object type.
   * Multiple types are combined with logical `OR`.
   */
  type: S.optional(S.Array(DXNStringSchema)),

  /**
   * Matches specific object id.
   * Multiple ids are combined with logical `OR`.
   */
  objectId: S.optional(S.Array(ObjectIdSchema)),

  /**
   * Filtering properties.
   *
   * Each filter is a tuple of three elements:
   * - Operator (e.g. `eq`, `ne`, `gt`, `lt`, `ge`, `le`).
   * - Field path in JSONPath syntax, leading `$` not required (e.g. `address.city`).
   * - Value to compare against.
   *
   * Multiple filters are combined with logical `AND`.
   */
  propertyFilters: S.optional(
    S.Array(
      S.Tuple(
        S.String.annotations({ description: 'Operator' }),
        S.String.annotations({ description: 'Field path' }),
        S.Any.annotations({ description: 'Value' }),
      ).annotations({
        description: 'Property filters',
        examples: [
          ['eq', 'address.city', 'warsaw'],
          ['ne', 'country', 'thailand'],
        ],
      }),
    ),
  ),

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

  // TODO(dmaretskyi): Consider adding a cypher query text extension.
}).pipe(S.mutable);

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
}).pipe(S.mutable);

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
