//
// Copyright 2020 DXOS.org
//

import matches from 'lodash.matches';

import { PublicKey, PublicKeyLike } from '@dxos/keys';

export type FilterFunction = (obj: any) => boolean;

/**
 * Utility to create simple filtering predicates.
 */
export class Filter {
  /**
   * Execute the filter over the supplied values.
   */
  static filter (values: IterableIterator<any>, filter: FilterFunction) {
    return Array.from(values).filter(value => filter(value));
  }

  /**
   * Negates a filter.
   */
  static not (filter: FilterFunction): FilterFunction {
    return value => !filter(value);
  }

  /**
   * ANDs all supplied filters.
   */
  static and (...filters: FilterFunction[]): FilterFunction {
    return value => filters.every(filter => filter(value));
  }

  /**
   * Filters objects for required property.
   */
  static hasProperty (property: string): FilterFunction {
    return ({ [property]: value }) => value !== undefined;
  }

  /**
   * Filters objects for given property values.
   */
  static propertyIn (property: string, values: any[]): FilterFunction {
    return ({ [property]: value }) => values.includes(value);
  }

  /**
   * Filters objects for required key.
   */
  static hasKey (property: string, key: PublicKeyLike): FilterFunction {
    return ({ [property]: value }) => PublicKey.from(value).equals(key);
  }

  /**
   * Filters objects for exact object.
   * https://lodash.com/docs/#matches
   */
  static matches (attributes: any): FilterFunction {
    return matches(attributes);
  }
}
