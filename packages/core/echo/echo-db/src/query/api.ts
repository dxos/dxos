//
// Copyright 2024 DXOS.org
//

import { type PublicKey } from '@dxos/keys';
import { type QueryOptions as QueryOptionsProto } from '@dxos/protocols/proto/dxos/echo/filter';

import type { Filter$, FilterSource } from './filter';
import { type Query } from './query';
import { type EchoReactiveObject } from '../echo-handler';

/**
 * `query` API function declaration.
 */
// TODO(dmaretskyi): Type based on the result format.
export interface QueryFn {
  (): Query;
  <F extends Filter$.Any>(filter: F, options?: QueryOptions | undefined): Query<EchoReactiveObject<Filter$.Object<F>>>;
  (filter?: FilterSource | undefined, options?: QueryOptions | undefined): Query<EchoReactiveObject<any>>;
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

export type QueryOptions = {
  format?: ResultFormat;

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
    spaces: options.spaces,
  };
};
