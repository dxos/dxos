//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type QueryAST } from '@dxos/echo-protocol';

import * as internal from './internal';

export interface Order<T> {
  // TODO(dmaretskyi): See new effect-schema approach to variance.
  '~Order': { value: T };

  'ast': QueryAST.Order;
}

export type Any = Order<any>;

class OrderClass implements Order<any> {
  private static 'variance': Order<any>['~Order'] = {} as Order<any>['~Order'];

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

/**
 * Order by a scalar property, named via a query binding (e.g. `Order.asc(_.created)`) — checked
 * against the row type. Also accepts a raw property name string for schema-agnostic call sites
 * (e.g. a generic table driven by user-configured column paths) where the property isn't known
 * until runtime and so can't be expressed as `_.foo`; unlike the binding form, a string name is
 * not checked against the row type.
 */
export const asc = (pathOrProperty: internal.Binding.BindingPath | string): Order<any> =>
  new OrderClass({
    kind: 'property',
    property: typeof pathOrProperty === 'string' ? pathOrProperty : internal.Binding.propertyOf(pathOrProperty),
    direction: 'asc',
  });

/**
 * Order by a scalar property, named via a query binding (e.g. `Order.desc(_.created)`) — checked
 * against the row type. Also accepts a raw property name string for schema-agnostic call sites
 * (e.g. a generic table driven by user-configured column paths) where the property isn't known
 * until runtime and so can't be expressed as `_.foo`; unlike the binding form, a string name is
 * not checked against the row type.
 */
export const desc = (pathOrProperty: internal.Binding.BindingPath | string): Order<any> =>
  new OrderClass({
    kind: 'property',
    property: typeof pathOrProperty === 'string' ? pathOrProperty : internal.Binding.propertyOf(pathOrProperty),
    direction: 'desc',
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
