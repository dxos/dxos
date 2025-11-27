//
// Copyright 2025 DXOS.org
//

import { type Database, Filter, Query, type QueryAST } from '@dxos/echo';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type QueryOptions as QueryOptionsProto } from '@dxos/protocols/proto/dxos/echo/filter';

export { Filter, Query };

export const optionsToProto = (options: Database.QueryOptions): QueryOptionsProto => {
  return {
    spaces: options.spaces,
    spaceIds: options.spaceIds,
    limit: options.limit,
  };
};

type NormalizeQueryOptions = {
  defaultSpaceId?: SpaceId;
};

export const normalizeQuery = (
  queryParam: unknown | undefined,
  userOptions: (Database.QueryOptions & QueryAST.QueryOptions) | undefined,
  opts?: NormalizeQueryOptions,
) => {
  let query: Query.Any;

  if (Query.is(queryParam)) {
    query = queryParam;
  } else if (Filter.is(queryParam)) {
    query = Query.select(queryParam);
  } else if (queryParam === undefined) {
    query = Query.select(Filter.everything());
  } else if (typeof queryParam === 'object' && queryParam !== null) {
    query = Query.select(Filter.props(queryParam));
  } else if (typeof queryParam === 'function') {
    throw new TypeError('Functions are not supported as queries');
  } else {
    log.error('Invalid query', { query: queryParam });
    throw new TypeError('Invalid query');
  }

  if (userOptions) {
    query = query.options({
      spaceIds: userOptions.spaceIds ?? (opts?.defaultSpaceId ? [opts.defaultSpaceId] : undefined),
      deleted: userOptions.deleted,
    });
  }

  return query;
};
