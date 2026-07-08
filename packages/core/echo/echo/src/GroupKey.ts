//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type QueryAST } from '@dxos/echo-protocol';

/**
 * Specifies a single component of a (possibly composite) group-by key.
 * `K` is the literal property name, preserved so `Query.groupBy` can build a `Pick<T, K>` key type.
 */
export interface GroupKey<K> {
  // TODO(dmaretskyi): See new effect-schema approach to variance.
  '~GroupKey': { key: K };

  'ast': QueryAST.GroupByKey;
}

export type Any = GroupKey<any>;

/**
 * Extracts the literal property name a {@link GroupKey} groups by.
 */
export type Property<Key extends Any> = Key extends GroupKey<infer K> ? K : never;

class GroupKeyClass implements GroupKey<any> {
  private static 'variance': GroupKey<any>['~GroupKey'] = {} as GroupKey<any>['~GroupKey'];

  static 'is'(value: unknown): value is Any {
    return typeof value === 'object' && value !== null && '~GroupKey' in value;
  }

  'constructor'(public readonly ast: QueryAST.GroupByKey) {}

  '~GroupKey' = GroupKeyClass.variance;
}

/**
 * Group by a scalar property value.
 * Objects whose property is missing, `null`, `undefined`, or non-scalar group under the `null` key.
 */
// TODO(dmaretskyi): Support nested properties, foreign keys, and other kinds (e.g. type).
export const property = <const K extends string>(property: K): GroupKey<K> =>
  new GroupKeyClass({ kind: 'property', property });
