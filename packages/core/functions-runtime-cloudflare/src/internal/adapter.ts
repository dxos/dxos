//
// Copyright 2024 DXOS.org
//

import { failUndefined } from '@dxos/debug';
import { type QueryAST } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { type EdgeFunctionEnv } from '@dxos/protocols';

export const queryToDataServiceRequest = (query: QueryAST.Query): EdgeFunctionEnv.QueryRequest => {
  const { filter, spaceIds } = extractSimpleQuery(query) ?? failUndefined();
  invariant(spaceIds?.length === 1, 'Only one space is supported');
  invariant(filter.type === 'object', 'Only object filters are supported');

  const spaceId = spaceIds[0];
  invariant(SpaceId.isValid(spaceId));

  return {
    spaceId,
    type: filter.typename ?? undefined,
    objectIds: [...(filter.id ?? [])],
  };
};

/**
 * Extracts the filter and space IDs from a query.
 * Supports Select(...), Options(Select(...)), and From(Select(...)) queries.
 */
const extractSimpleQuery = (
  query: QueryAST.Query,
): { filter: QueryAST.Filter; spaceIds?: readonly string[] } | null => {
  switch (query.type) {
    case 'options': {
      return extractSimpleQuery(query.query);
    }
    case 'from': {
      const inner = extractSimpleQuery(query.query);
      if (!inner) {
        return null;
      }
      const spaceIds = query.from._tag === 'scope' ? query.from.scope.spaceIds : undefined;
      return { filter: inner.filter, spaceIds: spaceIds ?? inner.spaceIds };
    }
    case 'select': {
      return { filter: query.filter };
    }
    default: {
      return null;
    }
  }
};
