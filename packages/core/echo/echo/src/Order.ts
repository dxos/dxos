//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type QueryAST } from '@dxos/echo-protocol';

import type * as Annotation from './Annotation.ts';

export const OrderTypeId = '~@dxos/echo/Order' as const;
export type OrderTypeId = typeof OrderTypeId;

export interface Order<T> {
  readonly [OrderTypeId]: { value: T };

  ast: QueryAST.Order;
}

export type Any = Order<any>;

class OrderClass implements Order<any> {
  private static 'variance': Order<any>[OrderTypeId] = {} as Order<any>[OrderTypeId];

  static is(value: unknown): value is Any {
    return typeof value === 'object' && value !== null && OrderTypeId in value;
  }

  constructor(public readonly ast: QueryAST.Order) {}

  [OrderTypeId] = OrderClass.variance;
}

/**
 * Order by the database's default order. For non-feed sources this is by id; for feed sources
 * this is insertion order, so `desc` reads newest-first. Defaults to `asc`.
 *
 * @performance O(1); builds an order AST node without sorting anything.
 */
export const natural = (direction: QueryAST.OrderDirection = 'asc'): Order<any> =>
  new OrderClass({ kind: 'natural', direction });
/**
 * Order by a property of the current result shape.
 *
 * @performance O(1); builds an order AST node without sorting anything.
 */
export const property = <T>(property: keyof T & string, direction: QueryAST.OrderDirection): Order<T> =>
  new OrderClass({
    kind: 'property',
    property,
    direction,
  });

/**
 * Order by relevance rank (for FTS/vector search results).
 * Higher rank = better match. Default direction is 'desc' (best matches first).
 *
 * @performance O(1); builds an order AST node without sorting anything.
 */
export const rank = <T>(direction: QueryAST.OrderDirection = 'desc'): Order<T> =>
  new OrderClass({
    kind: 'rank',
    direction,
  });

/**
 * Order by the system `updatedAt` timestamp (last re-indexed). Default direction is 'desc'
 * (most-recently-updated first). Mirrors {@link Filter.updated}.
 *
 * @performance O(1); builds an order AST node without sorting anything.
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
 *
 * @performance O(1); builds an order AST node without sorting anything.
 */
export const created = <T>(direction: QueryAST.OrderDirection = 'desc'): Order<T> =>
  new OrderClass({
    kind: 'timestamp',
    field: 'createdAt',
    direction,
  });

/** A value an annotation order can sort by. */
export type AnnotationScalar = string | number | boolean;

type PathDepth = [never, 0, 1, 2, 3];

/**
 * Key paths from `T` to a scalar field, as tuples; the depth bound keeps recursive value types finite.
 */
export type AnnotationPath<T, Depth extends number = 4> = [Depth] extends [never]
  ? never
  : T extends readonly unknown[]
    ? never
    : T extends object
      ? {
          [K in keyof T & string]-?: NonNullable<T[K]> extends AnnotationScalar
            ? readonly [K]
            : readonly [K, ...AnnotationPath<NonNullable<T[K]>, PathDepth[Depth]>];
        }[keyof T & string]
      : never;

/**
 * Order by an annotation set on the entity with `Annotation.set` (`meta.annotations[key]`).
 * A struct-valued annotation orders by the scalar at `path` (e.g. `['meters']`).
 * Entities without the annotation, or whose value is not a scalar, sort last in either direction.
 *
 * @performance O(1); builds an order AST node without sorting anything.
 */
export const annotation: {
  <T extends AnnotationScalar>(annotation: Annotation.Annotation<T>, direction?: QueryAST.OrderDirection): Order<any>;
  <T, const P extends AnnotationPath<T>>(
    annotation: Annotation.Annotation<T>,
    direction: QueryAST.OrderDirection,
    path: P,
  ): Order<any>;
} = (
  annotation: Annotation.Annotation<unknown>,
  direction: QueryAST.OrderDirection = 'asc',
  path?: readonly string[],
): Order<any> =>
  new OrderClass({
    kind: 'annotation',
    key: annotation.key,
    ...(path !== undefined && path.length > 0 ? { path: [...path] } : {}),
    direction,
  });
