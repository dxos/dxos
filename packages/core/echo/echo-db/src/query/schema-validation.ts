//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type Entity, Obj } from '@dxos/echo';
import { QueryAST } from '@dxos/echo-protocol';
import { DXN } from '@dxos/keys';

/**
 * Minimal schema resolver interface used by query-level schema validation.
 * Avoids coupling to the concrete RuntimeSchemaRegistry / DatabaseSchemaRegistry classes.
 */
export interface SchemaByDXNResolver {
  getSchemaByDXN(dxn: DXN): Schema.Schema.AnyNoContext | undefined;
}

export type SchemaResolvers = {
  runtime: SchemaByDXNResolver;
  persistent?: SchemaByDXNResolver;
};

/**
 * Returns true if the query opts out of schema validation.
 */
export const isSchemaValidationSkipped = (query: QueryAST.Query): boolean => {
  const options = QueryAST.getEffectiveOptions(query);
  return options?.skipSchemaValidation === true;
};

/**
 * Validates that every typename referenced by the query can be resolved either in the runtime or
 * persistent schema registry.
 *
 * Throws an error listing the unresolvable typenames.
 */
export const assertQueryTypenamesResolvable = (query: QueryAST.Query, resolvers: SchemaResolvers): void => {
  if (isSchemaValidationSkipped(query)) {
    return;
  }

  const typenames = QueryAST.collectTypenames(query);
  const unresolved: string[] = [];
  for (const typename of typenames) {
    const dxn = DXN.parse(typename);
    if (!canResolveSchema(dxn, resolvers)) {
      unresolved.push(typename);
    }
  }

  if (unresolved.length > 0) {
    throw new Error(`Query references unknown typename(s): ${unresolved.join(', ')}`);
  }
};

/**
 * Filter objects whose schema can't be resolved from the runtime or persistent registry.
 * Objects without a type DXN or whose type is not present in either registry are dropped.
 */
export const filterObjectsWithResolvableSchema = <T extends Entity.Unknown>(
  query: QueryAST.Query,
  entities: readonly T[],
  resolvers: SchemaResolvers,
): T[] => {
  if (isSchemaValidationSkipped(query)) {
    return entities as T[];
  }

  return entities.filter((entity) => {
    if (entity == null) return false;
    const typeDxn = Obj.getTypeDXN(entity);
    if (typeDxn == null) {
      return true;
    }
    return canResolveSchema(typeDxn, resolvers);
  });
};

const canResolveSchema = (dxn: DXN, resolvers: SchemaResolvers): boolean => {
  if (resolvers.runtime.getSchemaByDXN(dxn) != null) {
    return true;
  }
  if (resolvers.persistent != null && resolvers.persistent.getSchemaByDXN(dxn) != null) {
    return true;
  }
  return false;
};
