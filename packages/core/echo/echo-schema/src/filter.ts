import { DocumentModel, Reference } from '@dxos/document-model';
import { QueryOptions, ShowDeletedOption } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import { EchoObject } from './defs';
import { getReferenceWithSpaceKey } from './echo-object-base';
import { Schema } from './proto';
import { Expando, TypedObject } from './typed-object';

// TODO(burdon): Operators (EQ, NE, GT, LT, IN, etc.)
export type PropertyFilter = Record<string, any>;

export type OperatorFilter<T extends EchoObject> = (object: T) => boolean;

export type FilterSource<T extends EchoObject> = PropertyFilter | OperatorFilter<T> | Filter<T>;

// NOTE: `__phantom` property forces TS type check.
export type TypeFilter<T extends TypedObject> = { __phantom: T } & FilterSource<T>;

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
    } else if(source === undefined) {
      filter = new Filter({});
    } else if (typeof source === 'function') {
      filter = new Filter({
        predicate: source as any,
      });
    } else if(Array.isArray(source)) {
      filter = new Filter({
        andFilters: source.map(sourceItem => Filter.from(sourceItem))
      })
    } else if (typeof source === 'object' && source !== null) {
      filter = new Filter({
        properties: source,
      });
    } else {
      throw new Error(`Invalid filter source: ${source}`);
    }

    if(options) {
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
    res.andFilters = filters.map(filter => Filter.from(filter));
    return res;
  }

  static or<T extends EchoObject>(...filters: FilterSource<T>[]): Filter<T> {
    const res = new Filter({});
    res.orFilters = filters.map(filter => Filter.from(filter));
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
      type: new Reference(typename, 'protobuf', undefined),
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
}
