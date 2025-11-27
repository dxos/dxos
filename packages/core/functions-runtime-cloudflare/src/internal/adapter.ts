//
// Copyright 2024 DXOS.org
//

import { failUndefined } from '@dxos/debug';
import { type QueryAST } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { type EdgeFunctionEnv } from '@dxos/protocols';

export const queryToDataServiceRequest = (query: QueryAST.Query): EdgeFunctionEnv.QueryRequest => {
  const { filter, options } = isSimpleSelectionQuery(query) ?? failUndefined();
  invariant(options?.spaceIds?.length === 1, 'Only one space is supported');
  invariant(filter.type === 'object', 'Only object filters are supported');

  const spaceId = options.spaceIds[0];
  invariant(SpaceId.isValid(spaceId));

  return {
    spaceId,
    type: filter.typename ?? undefined,
    objectIds: [...(filter.id ?? [])],
  };
};

/**
 * Extracts the filter and options from a query.
 * Supports Select(...) and Options(Select(...)) queries.
 */
export const isSimpleSelectionQuery = (
  query: QueryAST.Query,
): { filter: QueryAST.Filter; options?: QueryAST.QueryOptions } | null => {
  switch (query.type) {
    case 'options': {
      const maybeFilter = isSimpleSelectionQuery(query.query);
      if (!maybeFilter) {
        return null;
      }
      return { filter: maybeFilter.filter, options: query.options };
    }
    case 'select': {
      return { filter: query.filter, options: undefined };
    }
    default: {
      return null;
    }
  }
};
