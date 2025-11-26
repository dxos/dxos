//
// Copyright 2025 DXOS.org
//

import { type QueryAST } from '@dxos/echo-protocol';

export interface Order<T> {
  // TODO(dmaretskyi): See new effect-schema approach to variance.
  '~Order': { value: T };

  ast: QueryAST.Order;
}

class OrderClass implements Order<any> {
  private static variance: Order<any>['~Order'] = {} as Order<any>['~Order'];

  static is(value: unknown): value is Order<any> {
    return typeof value === 'object' && value !== null && '~Order' in value;
  }

  constructor(public readonly ast: QueryAST.Order) {}

  '~Order' = OrderClass.variance;
}

export namespace Order {
  export const natural: Order<any> = new OrderClass({ kind: 'natural' });
  export const property = <T>(property: keyof T & string, direction: QueryAST.OrderDirection): Order<T> =>
    new OrderClass({
      kind: 'property',
      property,
      direction,
    });
}
