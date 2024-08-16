import type { Filter } from './filter';
import { Query } from './query';
import { type QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';

/**
 * `query` API function declaration.
 */
export interface QueryFn {
  (): Query;
  <T extends {} = any>(filter?: Filter<T> | undefined, options?: QueryOptions | undefined): Query<T>;
  <T extends {} = any>(filter?: T | undefined, options?: QueryOptions | undefined): Query;
}
