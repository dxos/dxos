//
// Copyright 2023 DXOS.org
//

import { DocumentModel, Reference } from '@dxos/document-model';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';

import { type EchoObject } from './defs';
import { getReferenceWithSpaceKey } from './echo-object-base';
import { type Schema } from './proto';
import { type Expando, type TypedObject } from './typed-object';

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

export const QUERY_ALL_MODELS = null;

// TODO(burdon): Operators (EQ, NE, GT, LT, IN, etc.)
export type PropertyFilter = Record<string, any>;

export type OperatorFilter<T extends EchoObject> = (object: T) => boolean;

export type FilterSource<T extends EchoObject> = PropertyFilter | OperatorFilter<T> | Filter<T>;

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
      filter = source;
    } else if (source === undefined) {
      filter = new Filter({});
    } else if (typeof source === 'function') {
      filter = new Filter({
        predicate: source as any,
      });
    } else if (Array.isArray(source)) {
      filter = new Filter({
        andFilters: source.map((sourceItem) => Filter.from(sourceItem)),
      });
    } else if (typeof source === 'object' && source !== null) {
      filter = new Filter({
        properties: source,
      });
    } else {
      throw new Error(`Invalid filter source: ${source}`);
    }

    if (options) {
      filter.setOptions(options);
    }

    return filter;
  }

  static not<T extends EchoObject>(source: Filter<T>): Filter<T> {
    const res = source.clone();
    res.invert = !res.invert;
    return res;
  }

  static and<T extends EchoObject>(...filters: FilterSource<T>[]): Filter<T> {
    const res = new Filter({});
    res.andFilters = filters.map((filter) => Filter.from(filter));
    return res;
  }

  static or<T extends EchoObject>(...filters: FilterSource<T>[]): Filter<T> {
    const res = new Filter({});
    res.orFilters = filters.map((filter) => Filter.from(filter));
    return res;
  }

  static schema(schema: Schema): Filter<Expando> {
    const ref = getReferenceWithSpaceKey(schema);
    invariant(ref, 'Schema may not be persisted in the database.');
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

  public properties?: Record<string, any>;
  public type?: Reference;
  public textMatch?: string;
  public predicate?: OperatorFilter<any>;

  public invert: boolean;
  public andFilters: Filter[];
  public orFilters: Filter[];

  public options: QueryOptions = {};

  constructor(params: FilterParams) {
    this.properties = params.properties;
    this.type = params.type;
    this.textMatch = params.textMatch;
    this.predicate = params.predicate;

    this.invert = params.invert ?? false;
    this.andFilters = params.andFilters ?? [];
    this.orFilters = params.orFilters ?? [];
  }

  clone(): Filter<T> {
    const filter = new Filter({});
    filter.properties = this.properties;
    filter.type = this.type;
    filter.textMatch = this.textMatch;
    filter.predicate = this.predicate;

    filter.invert = this.invert;
    filter.andFilters = this.andFilters;
    filter.orFilters = this.orFilters;
    filter.options = this.options;

    return filter;
  }

  setOptions(options: QueryOptions): Filter<T> {
    this.options = { ...this.options, ...options };
    return this;
  }

  get showDeletedPreference(): ShowDeletedOption {
    return this.options.deleted ?? ShowDeletedOption.HIDE_DELETED;
  }

  get modelFilterPreference(): string[] | null {
    if (this.options.models === undefined) {
      return [DocumentModel.meta.type];
    }

    return this.options.models;
  }

  get searchSpacesPreference(): PublicKey[] | undefined {
    return this.options.spaces?.map((entry) => ('key' in entry ? entry.key : (entry as PublicKey)));
  }
}
