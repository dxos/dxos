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
      if (node.from.scope.spaceIds) {
        for (const spaceId of node.from.scope.spaceIds) {
          spaces.add(SpaceId.make(spaceId));
        }
      }
    }
  };
  QueryAST.visit(query, visitor);
  return [...spaces];
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
        (query.from._tag === 'scope' && query.from.scope.queues && query.from.scope.queues.length > 0) ||
        maybeFilter.hasQueues;
      return {
        filter: maybeFilter.filter,
        options: maybeFilter.options,
        hasQueues: hasQueues || false,
      };
    }
    case 'select': {
      return { filter: query.filter, options: undefined };
    }
    default: {
      return null;
    }
  }
};
