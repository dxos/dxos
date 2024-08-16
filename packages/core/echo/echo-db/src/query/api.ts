import type { Filter, Filter$, FilterSource } from './filter';
import { Query } from './query';
import { type QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';

/**
 * `query` API function declaration.
 */
export interface QueryFn {
  (): Query;
  <F extends Filter$.Any>(filter: F, options?: QueryOptions | undefined): Query<Filter$.Object<F>>;
  (filter?: FilterSource | undefined, options?: QueryOptions | undefined): Query;
}
