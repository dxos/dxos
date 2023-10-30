//
// Copyright 2023 DXOS.org
//

import { DocumentModel, Reference } from '@dxos/document-model';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';

import { base, getDatabaseFromObject, isTypedObject, type EchoObject, type Expando, type TypedObject } from '../object';
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
// TODO(burdon): Disambiguate if multiple are defined (i.e., AND/OR).
export type FilterParams<T extends EchoObject> = {
  type?: Reference;
  properties?: Record<string, any>;
  text?: string;
  predicate?: OperatorFilter<T>;
  not?: boolean;
  and?: Filter[];
  or?: Filter[];
};

export class Filter<T extends EchoObject = EchoObject> {
  static from<T extends TypedObject>(source?: FilterSource<T>, options?: QueryOptions): Filter<T> {
    if (source === undefined || source === null) {
      return new Filter({}, options);
    } else if (source instanceof Filter) {
      return new Filter(source, options);
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

  static typename(typename: string, properties?: Record<string, any>) {
    return new Filter({
      type: Reference.fromLegacyTypename(typename),
      properties,
    });
  }

  static not<T extends EchoObject>(source: Filter<T>): Filter<T> {
    return new Filter({ ...source, not: !source.not }, source.options);
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

  // TODO(burdon): Make plain immutable object (unless generics are important).
  // TODO(burdon): Split into protobuf serializable and non-serializable (operator) predicates.

  public readonly type?: Reference;
  public readonly properties?: Record<string, any>;
  public readonly text?: string;
  public readonly predicate?: OperatorFilter<any>;
  public readonly not: boolean;
  public readonly and: Filter[];
  public readonly or: Filter[];
  public readonly options: QueryOptions = {};

  protected constructor(params: FilterParams<T>, options: QueryOptions = {}) {
    this.type = params.type;
    this.properties = params.properties;
    this.text = params.text;
    this.predicate = params.predicate;
    this.not = params.not ?? false;
    this.and = params.and ?? [];
    this.or = params.or ?? [];
    this.options = options;
  }

  // TODO(burdon): toJSON.

  get spaceKeys(): PublicKey[] | undefined {
    return this.options.spaces?.map((entry) => ('key' in entry ? entry.key : (entry as PublicKey)));
  }
}

// TODO(burdon): Move logic into Filter.
export const filterMatch = (filter: Filter, object: EchoObject): boolean => {
  const result = filterMatchInner(filter, object);
  return filter.not ? !result : result;
};

const filterMatchInner = (filter: Filter, object: EchoObject): boolean => {
  if (isTypedObject(object)) {
    const deleted = filter.options.deleted ?? ShowDeletedOption.HIDE_DELETED;
    if (object.__deleted) {
      if (deleted === ShowDeletedOption.HIDE_DELETED) {
        return false;
      }
    } else {
      if (deleted === ShowDeletedOption.SHOW_DELETED_ONLY) {
        return false;
      }
    }
  }

  // Match all models if null, otherwise default to documents.
  if (filter.options.models !== null) {
    // TODO(burdon): Expose default options that are merged if not null.
    const models = filter.options.models ?? [DocumentModel.meta.type];
    if (!models.includes(object[base]._modelConstructor.meta.type)) {
      return false;
    }
  }

  if (filter.or.length) {
    for (const orFilter of filter.or) {
      if (filterMatch(orFilter, object)) {
        return true;
      }
    }

    return false;
  }

  // TODO(burdon): Should match by default?
  let match = true;

  if (filter.type) {
    if (!isTypedObject(object)) {
      return false;
    }

    const type = object[base]._getType();
    if (!type) {
      return false;
    }

    // TODO(burdon): Comment.
    if (!compareType(filter.type, type, getDatabaseFromObject(object)?._backend.spaceKey)) {
      return false;
    }

    match = true;
  }

  if (filter.properties) {
    for (const key in filter.properties) {
      invariant(key !== '@type');
      const value = filter.properties[key];
      if ((object as any)[key] !== value) {
        return false;
      }
    }

    match = true;
  }

  if (filter.text !== undefined) {
    throw new Error('Text based search not implemented.');
  }

  if (filter.predicate && !filter.predicate(object)) {
    return false;
  }

  for (const andFilter of filter.and) {
    if (!filterMatch(andFilter, object)) {
      return false;
    }

    match = true;
  }

  return match;
};

// Type comparison is a bit weird due to backwards compatibility requirements.
// TODO(dmaretskyi): Deprecate `protobuf` protocol to clean this up.
export const compareType = (expected: Reference, actual: Reference, spaceKey?: PublicKey) => {
  const host = actual.protocol !== 'protobuf' ? actual?.host ?? spaceKey?.toHex() : actual.host ?? 'dxos.org';

  if (
    actual.itemId !== expected.itemId ||
    actual.protocol !== expected.protocol ||
    (host !== expected.host && actual.host !== expected.host)
  ) {
    return false;
  } else {
    return true;
  }
};
