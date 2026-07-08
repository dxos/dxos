//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type QueryAST } from '@dxos/echo-protocol';

import type * as Query from './Query';

/**
 * Whether an order sorts individual query results (`member`) or whole groups by a declared aggregate
 * (`aggregate`). A query's `orderBy` accepts exactly one kind: `member` before a `groupBy`, `aggregate`
 * after one — they are mutually exclusive (see {@link Query.orderBy}).
 */
export type Kind = 'member' | 'aggregate';

export interface Order<T, K extends Kind = 'member'> {
  // TODO(dmaretskyi): See new effect-schema approach to variance.
  '~Order': { value: T; kind: K };

  'ast': QueryAST.Order;
}

export type Any = Order<any, any>;

class OrderClass implements Order<any, any> {
  private static 'variance': Order<any, any>['~Order'] = {} as Order<any, any>['~Order'];

  static 'is'(value: unknown): value is Any {
    return typeof value === 'object' && value !== null && '~Order' in value;
  }

  'constructor'(public readonly ast: QueryAST.Order) {}

  '~Order' = OrderClass.variance;
}

/**
 * Order by the database's default order. For non-feed sources this is by id; for feed sources
 * this is insertion order, so `desc` reads newest-first. Defaults to `asc`.
 */
export const natural = (direction: QueryAST.OrderDirection = 'asc'): Order<any> =>
  new OrderClass({ kind: 'natural', direction });
export const property = <T>(property: keyof T & string, direction: QueryAST.OrderDirection): Order<T> =>
  new OrderClass({
    kind: 'property',
    property,
    direction,
  });

/**
 * Order by relevance rank (for FTS/vector search results).
 * Higher rank = better match. Default direction is 'desc' (best matches first).
 */
export const rank = <T>(direction: QueryAST.OrderDirection = 'desc'): Order<T> =>
  new OrderClass({
    kind: 'rank',
    direction,
  });

/**
 * Order by the system `updatedAt` timestamp (last re-indexed). Default direction is 'desc'
 * (most-recently-updated first). Mirrors {@link Filter.updated}.
 */
export const updated = <T>(direction: QueryAST.OrderDirection = 'desc'): Order<T> =>
  new OrderClass({
    kind: 'timestamp',
    field: 'updatedAt',
    direction,
  });

/**
 * Order by the system `createdAt` timestamp (first indexed). Default direction is 'desc'
 * (most-recently-created first). Mirrors {@link Filter.created}.
 */
export const created = <T>(direction: QueryAST.OrderDirection = 'desc'): Order<T> =>
  new OrderClass({
    kind: 'timestamp',
    field: 'createdAt',
    direction,
  });

/**
 * Order groups by one of the group's named aggregates (see `Query.aggregate`). Only valid on a
 * grouped query; groups are reordered as whole blocks, keeping their members contiguous and in
 * their pre-group order. `name` is checked against the aggregates declared for the group.
 */
export const aggregate = <T>(
  name: T extends Query.Group<any, any, infer A> ? keyof A & string : string,
  direction: QueryAST.OrderDirection,
): Order<T, 'aggregate'> =>
  new OrderClass({
    kind: 'aggregate',
    name,
    direction,
  });
