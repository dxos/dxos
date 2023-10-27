//
// Copyright 2023 DXOS.org
//

import defaultsDeep from 'lodash.defaultsdeep';

import { Reference } from '@dxos/document-model';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';

import { type EchoObject, type Expando, type TypedObject } from '../object';
import { getReferenceWithSpaceKey } from '../object';
import { type Schema } from '../proto';

/**
 * Controls how deleted items are filtered.
 */
export enum ShowDeletedOption {
  /**
   * Do not return deleted items. Default behaviour.
   */
  HIDE_DELETED = 0,
  /**
   * Return deleted and regular items.
   */
  SHOW_DELETED = 1,
  /**
   * Return only deleted items.
   */
  SHOW_DELETED_ONLY = 2,
}

export type QueryOptions = {
  /**
   * Controls how deleted items are filtered.
   */
  deleted?: ShowDeletedOption;

  /**
   * Filter by model.
   * @default * Only DocumentModel.
   */
  models?: string[] | null;

  /**
   * Query only in specific spaces.
   */
  spaces?: (PublicKey | { key: PublicKey })[];
};

// TODO(burdon): Operators (EQ, NE, GT, LT, IN, etc.)
export type PropertyFilter = Record<string, any>;

export type OperatorFilter<T extends EchoObject> = (object: T) => boolean;

export type FilterSource<T extends EchoObject> = PropertyFilter | OperatorFilter<T> | Filter<T>;

// TODO(burdon): Remove class.
export type FilterParams = {
  properties?: Record<string, any>;
  type?: Reference;
  textMatch?: string;
  predicate?: OperatorFilter<any>;
  invert?: boolean;
  andFilters?: Filter[];
  orFilters?: Filter[];
};

export class Filter<T extends EchoObject = EchoObject> {
  static from<T extends TypedObject>(source?: FilterSource<T>, options?: QueryOptions): Filter<T> {
    let filter: Filter;

    if (source instanceof Filter) {
      filter = source.clone();
    } else if (source === undefined) {
      filter = new Filter({}, options);
    } else if (typeof source === 'function') {
      filter = new Filter(
        {
          predicate: source as any,
        },
        options,
      );
    } else if (Array.isArray(source)) {
      filter = new Filter(
        {
          andFilters: source.map((sourceItem) => Filter.from(sourceItem)),
        },
        options,
      );
    } else if (typeof source === 'object' && source !== null) {
      filter = new Filter(
        {
          properties: source,
        },
        options,
      );
    } else {
      throw new Error(`Invalid filter source: ${source}`);
    }

    return filter;
  }

  static not<T extends EchoObject>(source: Filter<T>): Filter<T> {
    return source.clone({ invert: !source.invert });
  }

  static and<T extends EchoObject>(...filters: FilterSource<T>[]): Filter<T> {
    return new Filter({
      andFilters: filters.map((filter) => Filter.from(filter)),
    });
  }

  static or<T extends EchoObject>(...filters: FilterSource<T>[]): Filter<T> {
    return new Filter({
      orFilters: filters.map((filter) => Filter.from(filter)),
    });
  }

  static schema(schema: Schema): Filter<Expando> {
    const ref = getReferenceWithSpaceKey(schema);
    invariant(ref, 'Invalid schema; check persisted in the database.');
    return new Filter({
      type: ref,
    });
  }

  static byTypeName(typename: string, properties?: Record<string, any>) {
    return new Filter({
      type: Reference.fromLegacyTypeName(typename),
      properties,
    });
  }

  // TODO(burdon): Make plain immutable object.
  // TODO(burdon): Split into serializable and non-serializable.

  public readonly properties?: Record<string, any>;
  public readonly type?: Reference;
  public readonly textMatch?: string;
  public readonly predicate?: OperatorFilter<any>;
  public readonly invert: boolean;
  public readonly andFilters: Filter[];
  public readonly orFilters: Filter[];
  public readonly options: QueryOptions = {};

  protected constructor(params: FilterParams, options: QueryOptions = {}) {
    this.properties = params.properties;
    this.type = params.type;
    this.textMatch = params.textMatch;
    this.predicate = params.predicate;
    this.invert = params.invert ?? false;
    this.andFilters = params.andFilters ?? [];
    this.orFilters = params.orFilters ?? [];
    this.options = options;
  }

  protected clone(params: FilterParams = {}): Filter<T> {
    return new Filter(defaultsDeep({}, params, this), this.options);
  }

  // TODO(burdon): Document?
  get spaceKeys(): PublicKey[] | undefined {
    return this.options.spaces?.map((entry) => ('key' in entry ? entry.key : (entry as PublicKey)));
  }
}
