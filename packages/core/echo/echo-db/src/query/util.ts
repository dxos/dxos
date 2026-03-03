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
    if (node.type === 'options') {
      if (node.options.spaceIds) {
        for (const spaceId of node.options.spaceIds) {
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
 * Supports Select(...) and Options(Select(...)) queries.
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
        hasQueues: (query.options.queues && query.options.queues.length > 0) || maybeFilter.hasQueues,
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
