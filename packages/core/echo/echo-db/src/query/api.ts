//
// Copyright 2025 DXOS.org
//

import { Filter, Query } from '@dxos/echo';
import { type PublicKey, type SpaceId } from '@dxos/keys';
import { type Live } from '@dxos/live-object';
import { log } from '@dxos/log';
import { QueryOptions as QueryOptionsProto } from '@dxos/protocols/proto/dxos/echo/filter';

import { type QueryResult } from './query-result';

export { Filter, Query };

/**
 * `query` API function declaration.
 */
export interface QueryFn {
  // TODO(dmaretskyi): Remove query options.
  <Q extends Query.Any>(query: Q, options?: QueryOptions | undefined): QueryResult<Live<Query.Type<Q>>>;
  <F extends Filter.Any>(filter: F, options?: QueryOptions | undefined): QueryResult<Live<Filter.Type<F>>>;
}

/**
 * Common interface for Database and Queue.
 */
export interface Queryable {
  query: QueryFn;
}

/**
 * @deprecated Use `Query.options` instead.
 */
export type QueryOptions = {
  /**
   * @deprecated Use `spaceIds` instead.
   */
  spaces?: PublicKey[];

  /**
   * Query only in specific spaces.
   */
  // TODO(dmaretskyi): Change this to SpaceId.
  spaceIds?: string[];

  /**
   * Controls how deleted items are filtered.
   *
   * Options:
   *   - proto3_optional = true
   */
  deleted?: QueryOptionsProto.ShowDeletedOption;

  /**
   * Query only local spaces, or remote on agent.
   * @default `QueryOptions.DataLocation.LOCAL`
   *
   * Options:
   *   - proto3_optional = true
   */
  dataLocation?: QueryOptionsProto.DataLocation;

  /**
   * Specify which references are to inline in the result.
   */
  include?: QueryJoinSpec;

  /**
   * Return only the first `limit` results.
   */
  limit?: number;
};

export interface QueryJoinSpec extends Record<string, true | QueryJoinSpec> {}

export const optionsToProto = (options: QueryOptions): QueryOptionsProto => ({
  spaces: options.spaces,
  spaceIds: options.spaceIds,
  deleted: options.deleted,
  dataLocation: options.dataLocation,
  include: options.include,
  limit: options.limit,
});

type NormalizeQueryOptions = {
  defaultSpaceId?: SpaceId;
};

export const normalizeQuery = (
  queryParam: unknown | undefined,
  userOptions: QueryOptions | undefined,
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
      deleted:
        userOptions?.deleted === undefined
          ? undefined
          : userOptions?.deleted === QueryOptionsProto.ShowDeletedOption.SHOW_DELETED
            ? 'include'
            : userOptions?.deleted === QueryOptionsProto.ShowDeletedOption.HIDE_DELETED
              ? 'exclude'
              : 'only',
    });
  }

  return query;
};
