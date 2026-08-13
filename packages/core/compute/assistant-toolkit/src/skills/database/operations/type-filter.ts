//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Query as EchoQuery, Filter, Scope, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

/**
 * Every schema registered under `typename`, from the space and the static registry alike.
 * More than one when versions coexist; empty when the typename is unknown.
 */
export const schemasByTypename = Effect.fn(function* (typename: string) {
  const types = yield* Database.query(EchoQuery.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry()))
    .run;
  return types.filter((type) => Type.getTypename(type) === typename);
});

/**
 * Builds a filter matching every object of `typename`, whichever schema stamped it.
 *
 * A filter built from a resolved schema entity matches exactly: a static schema yields a versioned
 * DXN, so an object created against an earlier version of the same type never matches, and a
 * space-local (stored) schema yields an EID, so an object stamped with the plain typename DXN never
 * matches either. OR-ing the version-less DXN with every registered schema of that typename makes
 * the typename alone sufficient — which is all a caller has.
 */
export const typenameFilter = Effect.fn(function* (typename: string) {
  const schemas = yield* schemasByTypename(typename);
  return Filter.or(Filter.type(DXN.make(typename)), ...schemas.map((schema) => Filter.type(schema)));
});
