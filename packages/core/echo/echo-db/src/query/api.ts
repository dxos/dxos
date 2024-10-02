//
// Copyright 2024 DXOS.org
//

import type { EchoReactiveObject } from '@dxos/echo-schema';
import type { PublicKey } from '@dxos/keys';
import { type QueryOptions as QueryOptionsProto } from '@dxos/protocols/proto/dxos/echo/filter';

import type { Filter$, FilterSource } from './filter';
import { type Query } from './query';

/**
 * `query` API function declaration.
 */
export interface QueryFn {
  (): Query;
  <F extends Filter$.Any>(filter: F, options?: QueryOptions | undefined): Query<EchoReactiveObject<Filter$.Object<F>>>;
  (filter?: FilterSource | undefined, options?: QueryOptions | undefined): Query<EchoReactiveObject<any>>;
}

export type QueryOptions = {
  /**
   * Query only in specific spaces.
   */
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
