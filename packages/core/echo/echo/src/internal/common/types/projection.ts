//
// Copyright 2026 DXOS.org
//

import type * as Types from 'effect/Types';

import { type QueryAST } from '@dxos/echo-protocol';

/**
 * Brand for a query projected to a single scalar property (`Query.project`), consumed by
 * `Filter.in` to build a subquery-membership predicate — an uncorrelated
 * `col IN (SELECT property FROM ...)` semi-join. Defined in common/ (not in Query/) so
 * Filter.ts can recognize the brand without importing Query.ts as a value: Query.ts already
 * imports Filter.ts as a value, so a reverse value import would create a cycle. Both
 * Filter.ts and Query.ts import this shared leaf module instead.
 *
 * A string-literal id (not a `Symbol.for`), matching `FilterTypeId`/`QueryTypeId`/`OrderTypeId` —
 * this lets the sandboxed `query-lite` mirror (which cannot import `@dxos/echo`'s runtime) declare
 * its own local constant with the same literal and construct structurally-compatible objects,
 * the same way it already does for those brands.
 */
export const ProjectionTypeId = '~@dxos/echo/Query.Projection' as const;
export type ProjectionTypeId = typeof ProjectionTypeId;

/**
 * `V` is the projected property's value type — carried only as a phantom brand (like
 * `Filter<T>`'s `[FilterTypeId]: { value: Types.Covariant<T> }`) so `Filter.in(query.project(k))`
 * infers its own type parameter from the projected property instead of defaulting to `unknown`.
 */
export interface Projection<V = unknown> {
  readonly [ProjectionTypeId]: { value: Types.Covariant<V> };
  readonly query: QueryAST.Query;
  readonly property: string;
}

export const isProjection = (value: unknown): value is Projection =>
  typeof value === 'object' && value !== null && ProjectionTypeId in value;

const variance: Projection<any>[ProjectionTypeId] = {} as Projection<any>[ProjectionTypeId];

export const makeProjection = <V>(query: QueryAST.Query, property: string): Projection<V> => ({
  [ProjectionTypeId]: variance,
  query,
  property,
});
