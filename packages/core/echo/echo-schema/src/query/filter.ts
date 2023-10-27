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
// TODO(burdon): Rename.
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
  type?: Reference;
  properties?: Record<string, any>;
  textMatch?: string;
  predicate?: OperatorFilter<any>;
  not?: boolean;
  and?: Filter[];
  or?: Filter[];
};

export class Filter<T extends EchoObject = EchoObject> {
  static from<T extends TypedObject>(source?: FilterSource<T>, options?: QueryOptions): Filter<T> {
    if (source === undefined || source === null) {
      return new Filter({}, options);
    } else if (source instanceof Filter) {
      return source.clone();
    } else if (typeof source === 'function') {
      return new Filter(
        {
          predicate: source as any,
        },
        options,
      );
    } else if (Array.isArray(source)) {
      return new Filter(
        {
          and: source.map((sourceItem) => Filter.from(sourceItem)),
        },
        options,
      );
    } else if (typeof source === 'object') {
      return new Filter(
        {
          properties: source,
        },
        options,
      );
    } else {
      throw new Error(`Invalid filter source: ${source}`);
    }
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

  static not<T extends EchoObject>(source: Filter<T>): Filter<T> {
    return source.clone({ not: !source.not });
  }

  static and<T extends EchoObject>(...filters: FilterSource<T>[]): Filter<T> {
    return new Filter({
      and: filters.map((filter) => Filter.from(filter)),
    });
  }

  static or<T extends EchoObject>(...filters: FilterSource<T>[]): Filter<T> {
    return new Filter({
      or: filters.map((filter) => Filter.from(filter)),
    });
  }

  // TODO(burdon): Make plain immutable object.
  // TODO(burdon): Split into serializable and non-serializable.

  public readonly type?: Reference;
  public readonly properties?: Record<string, any>;
  public readonly textMatch?: string;
  public readonly predicate?: OperatorFilter<any>;
  public readonly not: boolean;
  public readonly and: Filter[];
  public readonly or: Filter[];
  public readonly options: QueryOptions = {};

  protected constructor(params: FilterParams, options: QueryOptions = {}) {
    this.type = params.type;
    this.properties = params.properties;
    this.textMatch = params.textMatch;
    this.predicate = params.predicate;
    this.not = params.not ?? false;
    this.and = params.and ?? [];
    this.or = params.or ?? [];
    this.options = options;
  }

  // TODO(burdon): JSON tree.

  // TODO(burdon): If predicate is { foo: undefined } then this is removed.
  protected clone(params: FilterParams = {}): Filter<T> {
    return new Filter(defaultsDeep({}, params, this), this.options);
  }

  get spaceKeys(): PublicKey[] | undefined {
    return this.options.spaces?.map((entry) => ('key' in entry ? entry.key : (entry as PublicKey)));
  }
}
