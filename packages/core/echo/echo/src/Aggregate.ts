//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as internal from './internal';

/**
 * A per-group aggregate declaration, materialised as a top-level field on the result of
 * `Query.map`/`Query.reduce`. `V` is the value the aggregate produces.
 */
export interface Aggregate<V> {
  // TODO(dmaretskyi): See new effect-schema approach to variance.
  '~Aggregate': { value: V };

  /** The aggregate spec sans name; the name is supplied by the `Query.map`/`reduce` record key. */
  'spec': { kind: 'max' | 'min' | 'items' | 'count'; property?: string };
}

export type Any = Aggregate<any>;

/** Extracts the value type a {@link Aggregate} produces. */
export type ValueOf<A> = A extends Aggregate<infer V> ? V : never;

class AggregateClass<V> implements Aggregate<V> {
  private static 'variance': Aggregate<any>['~Aggregate'] = {} as Aggregate<any>['~Aggregate'];

  static 'is'(value: unknown): value is Any {
    return typeof value === 'object' && value !== null && '~Aggregate' in value;
  }

  'constructor'(public readonly spec: { kind: 'max' | 'min' | 'items' | 'count'; property?: string }) {}

  '~Aggregate' = AggregateClass.variance as Aggregate<V>['~Aggregate'];
}

/**
 * Aggregate the maximum of a scalar property across the group's members.
 * `path` names the property via a query binding (e.g. `Aggregate.max(_.created)`), which both
 * checks it exists on the member and flows its type into the aggregate's value type.
 */
export const max = <V>(path: internal.Binding.BindingPath<readonly string[], V>): Aggregate<V | null> =>
  new AggregateClass({ kind: 'max', property: internal.Binding.propertyOf(path) });

/**
 * Aggregate the minimum of a scalar property across the group's members.
 */
export const min = <V>(path: internal.Binding.BindingPath<readonly string[], V>): Aggregate<V | null> =>
  new AggregateClass({ kind: 'min', property: internal.Binding.propertyOf(path) });

/**
 * Collect the group's members. Opt-in — groups carry no members unless this aggregate is declared.
 *
 * Takes the root binding purely to pin its value type to the member type at the call site (e.g.
 * `Aggregate.items(_)`) — TypeScript cannot otherwise infer a bare generic from a callback's return
 * position, so an argless `items()` would type as `unknown[]` instead of the real member type.
 */
export const items = <T>(_row: internal.Binding.BindingPath<readonly string[], T>): Aggregate<T[]> =>
  new AggregateClass({ kind: 'items' });

/**
 * Count the group's members. Opt-in — groups carry no count unless this aggregate is declared.
 */
export const count = (): Aggregate<number> => new AggregateClass({ kind: 'count' });
