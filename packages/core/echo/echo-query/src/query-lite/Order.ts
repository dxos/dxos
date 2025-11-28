//
// Copyright 2025 DXOS.org
//

import type { Order as Order$, QueryAST } from '@dxos/echo';

class OrderClass implements Order$.Any {
  private static variance: Order$.Any['~Order'] = {} as Order$.Any['~Order'];

  static is(value: unknown): value is Order$.Any {
    return typeof value === 'object' && value !== null && '~Order' in value;
  }

  constructor(public readonly ast: QueryAST.Order) {}

  '~Order' = OrderClass.variance;
}

export const natural: Order$.Any = new OrderClass({ kind: 'natural' });
export const property = <T>(property: keyof T & string, direction: QueryAST.OrderDirection): Order$.Order<T> =>
  new OrderClass({
    kind: 'property',
    property,
    direction,
  });
