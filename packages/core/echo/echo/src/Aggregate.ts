//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

/**
 * A per-group aggregate declaration, materialised as a top-level field on `Query.Group` and
 * orderable via a post-group `orderBy(Order.property(name))`. Name it via the record passed to
 * `Query.aggregate({ name: Aggregate.max('created') })`.
 *
 * `T` is the group's member type (so a reduced property is checked against it); `V` is the value
 * the aggregate produces.
 */
export interface Aggregate<T, V> {
  // TODO(dmaretskyi): See new effect-schema approach to variance.
  '~Aggregate': { element: T; value: V };

  /** The aggregate spec sans name; the name is supplied by the `Query.aggregate` record key. */
  'spec': { kind: 'max' | 'min' | 'items' | 'count'; property?: string };
}

export type Any = Aggregate<any, any>;

/** Extracts the value type a {@link Aggregate} produces. */
export type ValueOf<A> = A extends Aggregate<any, infer V> ? V : never;

class AggregateClass<T, V> implements Aggregate<T, V> {
  private static 'variance': Aggregate<any, any>['~Aggregate'] = {} as Aggregate<any, any>['~Aggregate'];

  static 'is'(value: unknown): value is Any {
    return typeof value === 'object' && value !== null && '~Aggregate' in value;
  }

  'constructor'(public readonly spec: { kind: 'max' | 'min' | 'items' | 'count'; property?: string }) {}

  '~Aggregate' = AggregateClass.variance as Aggregate<T, V>['~Aggregate'];
}

/**
 * Aggregate the maximum of a scalar property across the group's members.
 * `T` is inferred from the `Query.aggregate` context, so `property` is checked against the group's
 * member type (like {@link Order.property} / {@link GroupKey.property}).
 */
export const max = <T, K extends keyof T & string>(property: K): Aggregate<T, T[K] | null> =>
  new AggregateClass({ kind: 'max', property });

/**
 * Aggregate the minimum of a scalar property across the group's members.
 */
export const min = <T, K extends keyof T & string>(property: K): Aggregate<T, T[K] | null> =>
  new AggregateClass({ kind: 'min', property });

/**
 * Collect the group's members. Opt-in — groups carry no members unless this aggregate is declared.
 */
export const items = <T>(): Aggregate<T, T[]> => new AggregateClass({ kind: 'items' });

/**
 * Count the group's members. Opt-in — groups carry no count unless this aggregate is declared.
 */
export const count = <T>(): Aggregate<T, number> => new AggregateClass({ kind: 'count' });
