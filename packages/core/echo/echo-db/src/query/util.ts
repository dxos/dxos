//
// Copyright 2025 DXOS.org
//

import { QueryAST } from '@dxos/echo-protocol';
import { SpaceId } from '@dxos/keys';

/**
 * Lists spaces this query will select from.
 */
export const getTargetSpacesForQuery = (query: QueryAST.Query): SpaceId[] => {
  const spaces = new Set<SpaceId>();

  const visitor = (node: QueryAST.Query) => {
    if (node.type === 'from' && node.from._tag === 'scope') {
      for (const scope of node.from.scopes) {
        // A space scope without `spaceId` targets the owning space; it adds no
        // explicit space restriction (resolved by the executing database).
        if (scope._tag === 'space' && scope.spaceId !== undefined) {
          spaces.add(SpaceId.make(scope.spaceId));
        }
      }
    }
  };
  QueryAST.visit(query, visitor);
  return [...spaces];
};

const filterContainsTimestamp = (filter: QueryAST.Filter) => {
  if (filter.type === 'timestamp') {
    return true;
  }
  if (filter.type === 'and' || filter.type === 'or') {
    return filter.filters.some(filterContainsTimestamp);
  }
  if (filter.type === 'not') {
    return filterContainsTimestamp(filter.filter);
  }
  return false;
};

const filterContainsChildOf = (filter: QueryAST.Filter): boolean => {
  if (filter.type === 'child-of') {
    return true;
  }
  if (filter.type === 'and' || filter.type === 'or') {
    return filter.filters.some(filterContainsChildOf);
  }
  if (filter.type === 'not') {
    return filterContainsChildOf(filter.filter);
  }
  return false;
};

/**
 * Extracts the filter and options from a query.
 * Supports Select(...), Options(Select(...)), and From(Select(...)) queries.
 */
export const isSimpleSelectionQuery = (
  query: QueryAST.Query,
): { filter: QueryAST.Filter; options?: QueryAST.QueryOptions; hasQueues?: boolean } | null => {
  switch (query.type) {
    case 'options': {
      const maybeFilter = isSimpleSelectionQuery(query.query);
      if (!maybeFilter) {
        return null;
      }
      return {
        filter: maybeFilter.filter,
        options: query.options,
        hasQueues: maybeFilter.hasQueues,
      };
    }
    case 'from': {
      const maybeFilter = isSimpleSelectionQuery(query.query);
      if (!maybeFilter) {
        return null;
      }
      const hasQueues =
        (query.from._tag === 'scope' && query.from.scopes.some((s) => s._tag === 'feed')) || maybeFilter.hasQueues;
      return {
        filter: maybeFilter.filter,
        options: maybeFilter.options,
        hasQueues: hasQueues || false,
      };
    }
    case 'select': {
      if (filterContainsTimestamp(query.filter) || filterContainsChildOf(query.filter)) {
        return null;
      }
      return { filter: query.filter, options: undefined };
    }
    default: {
      return null;
    }
  }
};

export type RegistryQueryScope = { included: boolean; locations: ReadonlySet<'local' | 'remote'> };

/**
 * Determines whether a query targets the in-process or remote registry.
 *
 * The registry is opt-in: a query only includes it when its `from` clause carries an
 * explicit registry scope (`Scope.registry(...)`).
 *
 * - No `from` clause → excluded (owning-space query; registry not consulted).
 * - `from` clause with no registry scope entries → excluded.
 * - `from` clause with registry scope entries → include the listed locations.
 */
export const getRegistryScopeForQuery = (query: QueryAST.Query): RegistryQueryScope => {
  let fromNode: QueryAST.QueryFromClause | null = null;

  QueryAST.visit(query, (node) => {
    if (node.type === 'from') {
      fromNode = node;
    }
  });

  if (fromNode === null) {
    return { included: false, locations: new Set() };
  }

  const clause = fromNode as QueryAST.QueryFromClause;
  if (clause.from._tag !== 'scope') {
    return { included: false, locations: new Set() };
  }

  const registryScopes = clause.from.scopes.filter((s): s is QueryAST.RegistryScope => s._tag === 'registry');
  if (registryScopes.length === 0) {
    return { included: false, locations: new Set() };
  }

  return {
    included: true,
    locations: new Set(registryScopes.map((s) => s.location)),
  };
};
