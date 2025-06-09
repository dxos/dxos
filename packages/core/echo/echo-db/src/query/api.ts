//
// Copyright 2024 DXOS.org
//

//
// Copyright 2025 DXOS.org
//

import { Filter, Query } from '@dxos/echo-schema';
import { type PublicKey, type SpaceId } from '@dxos/keys';
import type { Live } from '@dxos/live-object';
import { log } from '@dxos/log';
import { QueryOptions as QueryOptionsProto } from '@dxos/protocols/proto/dxos/echo/filter';

import type { FilterSource } from './deprecated';
import { type QueryResult } from './query-result';

export { Filter, Query };

/**
 * `query` API function declaration.
 */
export interface QueryFn {
  // TODO(dmaretskyi): Remove query options.
  <Q extends Query.Any>(query: Q, options?: QueryOptions | undefined): QueryResult<Live<Query.Type<Q>>>;

  /**
   * @deprecated Pass `Query` instead.
   */
  (): QueryResult;

  /**
   * @deprecated Pass `Query` instead.
   */
  <F extends Filter.Any>(filter: F, options?: QueryOptions | undefined): QueryResult<Live<Filter.Type<F>>>;

  /**
   * @deprecated Pass `Query` instead.
   */
  (filter?: FilterSource | undefined, options?: QueryOptions | undefined): QueryResult<Live<any>>;
}

/**
 * Defines the result format of the query.
 */
export enum ResultFormat {
  /**
   * Plain javascript objects.
   * No live updates.
   */
  Plain = 'plain',

  /**
   * Live objects that update automatically with mutations in the database.
   * Support signal notifications.
   */
  Live = 'live',

  /**
   * Direct access to the automerge document.
   */
  AutomergeDocAccessor = 'automergeDocAccessor',
}

/**
 * @deprecated Use `Query.options` instead.
 */
export type QueryOptions = {
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

  /**
   * @deprecated Stick to live format.
   */
  format?: ResultFormat;

  /**
   * @deprecated Use `spaceIds` instead.
   */
  spaces?: PublicKey[];
};

export interface QueryJoinSpec extends Record<string, true | QueryJoinSpec> {}

export const optionsToProto = (options: QueryOptions): QueryOptionsProto => {
  return {
    spaceIds: options.spaceIds,
    deleted: options.deleted,
    dataLocation: options.dataLocation,
    include: options.include,
    limit: options.limit,
    spaces: options.spaces,
  };
};

type NormalizeQueryOptions = {
  defaultSpaceId?: SpaceId;
};

export const normalizeQuery = (
  query_: unknown | undefined,
  userOptions: QueryOptions | undefined,
  opts?: NormalizeQueryOptions,
) => {
  let query: Query.Any;

  if (Query.is(query_)) {
    query = query_;
  } else if (Filter.is(query_)) {
    query = Query.select(query_);
  } else if (query_ === undefined) {
    query = Query.select(Filter.everything());
  } else if (typeof query_ === 'object' && query_ !== null) {
    query = Query.select(Filter._props(query_));
  } else if (typeof query_ === 'function') {
    throw new TypeError('Functions are not supported as queries');
  } else {
    log.error('Invalid query', { query: query_ });
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
