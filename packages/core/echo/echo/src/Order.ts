//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type QueryAST } from '@dxos/echo-protocol';

export interface Order<T> {
  // TODO(dmaretskyi): See new effect-schema approach to variance.
  '~Order': { value: T };

  'ast': QueryAST.Order;
}

export type Any = Order<any>;

class OrderClass implements Order<any> {
  private static 'variance': Order<any>['~Order'] = {} as Order<any>['~Order'];

  static 'is'(value: unknown): value is Order<any> {
    return typeof value === 'object' && value !== null && '~Order' in value;
  }

  'constructor'(public readonly ast: QueryAST.Order) {}

  '~Order' = OrderClass.variance;
}

export const natural: Order<any> = new OrderClass({ kind: 'natural' });
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
