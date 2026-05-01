//
// Copyright 2026 DXOS.org
//

import { Entity, type QueryResult, type Ref } from '@dxos/echo';
import { QueryAST } from '@dxos/echo-protocol';
import { DXN } from '@dxos/keys';

/**
 * Returns true if the query has a queue scope (`.from({ queues: [...] })`).
 * Queues are a raw append-anything protocol, so schema validation is skipped for queue-scoped queries.
 */
const queryTargetsQueue = (query: QueryAST.Query): boolean => {
  let hasQueues = false;
  QueryAST.visit(query, (node) => {
    if (node.type === 'from' && node.from._tag === 'scope' && node.from.scope.queues !== undefined) {
      hasQueues = true;
    }
  });
  return hasQueues;
};

/**
 * Returns true if the query opts out of schema validation.
 */
export const isSchemaValidationSkipped = (query: QueryAST.Query): boolean => {
  const options = QueryAST.getEffectiveOptions(query);
  if (options?.skipSchemaValidation === true) return true;
  return queryTargetsQueue(query);
};

/**
 * Returns true if the given typename DXN can be resolved by the resolver.
 */
export const canResolveSchema = (dxn: DXN, resolver: Ref.Resolver): boolean => {
  return resolver.resolveSchemaSync(dxn) != null;
};

/**
 * Validates that every typename referenced by the query can be resolved through the supplied
 * resolver (which combines runtime + persistent schema registries).
 *
 * Throws an error listing the unresolvable typenames.
 */
export const assertQueryTypenamesResolvable = (query: QueryAST.Query, resolver: Ref.Resolver): void => {
  if (isSchemaValidationSkipped(query)) {
    return;
  }

  const typenames = QueryAST.collectTypenames(query);
  const unresolved: string[] = [];
  for (const typename of typenames) {
    // Use tryParse so malformed typenames surface as "unknown" rather than aborting validation.
    const dxn = DXN.tryParse(typename);
    if (dxn == null || !canResolveSchema(dxn, resolver)) {
      unresolved.push(typename);
    }
  }

  if (unresolved.length > 0) {
    throw new Error(`Query references unknown typename(s): ${unresolved.join(', ')}`);
  }
};

const hasResolvableSchema = (entity: Entity.Unknown | null | undefined, resolver: Ref.Resolver): boolean => {
  if (entity == null) return false;
  const typeDxn = Entity.getTypeDXN(entity);
  if (typeDxn == null) return true;
  return canResolveSchema(typeDxn, resolver);
};

/**
 * Filter objects whose schema can't be resolved by the resolver.
 * Objects without a type DXN or whose type is not resolvable are dropped.
 */
export const filterObjectsWithResolvableSchema = <T extends Entity.Unknown>(
  query: QueryAST.Query,
  entities: readonly T[],
  resolver: Ref.Resolver,
): T[] => {
  if (isSchemaValidationSkipped(query)) {
    return entities as T[];
  }
  return entities.filter((entity) => hasResolvableSchema(entity, resolver));
};

/**
 * Same as {@link filterObjectsWithResolvableSchema} but operates on {@link QueryResult.Entry} items,
 * filtering by `entry.result`.
 */
export const filterEntriesWithResolvableSchema = <T extends Entity.Unknown, E extends QueryResult.Entry<T>>(
  query: QueryAST.Query,
  entries: readonly E[],
  resolver: Ref.Resolver,
): E[] => {
  if (isSchemaValidationSkipped(query)) {
    return entries as E[];
  }
  return entries.filter((entry) => {
    if (entry.result == null) return true;
    return hasResolvableSchema(entry.result, resolver);
  });
};
