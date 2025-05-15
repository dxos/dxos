//
// Copyright 2023 DXOS.org
//

import { Schema } from 'effect';

import { type EncodedReference, type ForeignKey, isEncodedReference } from '@dxos/echo-protocol';
import { type BaseObject, requireTypeReference } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { DXN, LOCAL_SPACE_TAG, type PublicKey, type SpaceId } from '@dxos/keys';
import { createBuf } from '@dxos/protocols/buf';
import {
  type Filter as FilterBuf,
  FilterSchema,
  type QueryOptions_DataLocation,
  type QueryOptions_ShowDeletedOption,
} from '@dxos/protocols/buf/dxos/echo/filter_pb';
import { type Filter as FilterProto, type QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';

import { getReferenceWithSpaceKey } from '../../echo-handler';
import type { QueryAST } from '..';
import { mapValues } from '@dxos/util';
import { raise } from '@dxos/debug';

// TODO(dmaretskyi): Rename `hasInstanceOf`.
// TODO(dmaretskyi): Remove from echo api
/**
 * @deprecated Use `isInstanceOf` instead.
 */
export const hasType =
  <T extends BaseObject>(type: { new (): T }) =>
  (object: BaseObject | undefined): object is T =>
    object instanceof type;

// TODO(burdon): Operators (EQ, NE, GT, LT, IN, etc.)
export interface PropertyFilter {
  /**
   * Filter by specific ID.
   */
  id?: string | EncodedReference | (string | EncodedReference)[];

  /**
   * Filter by specific typename.
   * Examples:
   *  - `dxos.org/type/Script`
   *  - `dxn:type:dxos.org/type/Script`
   *  - `dxn:echo:@:01J6WF55G5W3AQWJSC4TQWJNAE` - dynamic schema refrence.
   */
  __typename?: string | string[];

  /**
   * Filter by property.
   */
  [key: string]: any;
}

export type OperatorFilter<T extends BaseObject = any> = (object: T) => boolean;

export type FilterSource<T extends BaseObject = any> = PropertyFilter | OperatorFilter<T> | Filter<T> | string;

// TODO(burdon): Remove class.
// TODO(burdon): Disambiguate if multiple are defined (i.e., AND/OR).
export type FilterParams<T extends BaseObject = any> = {
  type?: DXN[];
  properties?: Record<string, any>;
  objectIds?: string[];
  text?: string;
  metaKeys?: ForeignKey[];

  predicate?: OperatorFilter<T>;

  not?: boolean;
  and?: Filter[];
  or?: Filter[];
};

/**
 * Filter helper types.
 * Note: Dollar sign suffix notation borrowed from `effect`'s Array$.
 */
export namespace Filter$ {
  export type Any = Filter<any>;
  export type Object<F extends Any> = F extends Filter<infer T> ? T : never;
}

export class Filter<T extends BaseObject = any> {
  static from<T extends BaseObject>(source?: FilterSource<T>, options?: QueryOptions): Filter<T> {
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
    } else if (typeof source === 'string') {
      return new Filter(
        {
          text: source,
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
      return Filter.fromFilterJson(source, options);
    } else {
      throw new Error(`Invalid filter source: ${source}`);
    }
  }

  static fromFilterJson<T extends BaseObject>(source: PropertyFilter, options?: QueryOptions): Filter<T> {
    const { id, __typename, ...properties } = source;

    if (typeof id === 'string' || (Array.isArray(id) && id.length > 1)) {
      if (__typename || Object.keys(properties).length > 0) {
        throw new Error('Cannot specify id with other properties.');
      }
    }

    let type: DXN[] | undefined;
    if (__typename) {
      const typenames = Array.isArray(__typename) ? __typename : [__typename];
      type = typenames.map((typename) => {
        if (typename.startsWith('dxn:')) {
          return DXN.parse(typename);
        } else {
          return new DXN(DXN.kind.TYPE, [typename]);
        }
      });
    }

    return new Filter(
      {
        objectIds: id !== undefined ? sanitizeIdArray(id) : undefined,
        type,
        properties,
      },
      options,
    );
  }

  static all(): Filter {
    return new Filter({});
  }

  static nothing(): Filter {
    return new Filter({ not: true });
  }

  // TODO(burdon): Tighten to TypedObject.
  static schema<S extends Schema.Schema.All>(
    schema: S,
    filter?: Record<string, any> | OperatorFilter<Schema.Schema.Type<S>>,
  ): Filter<Schema.Schema.Type<S>>;

  // TODO(burdon): Tighten to TypedObject.
  static schema(schema: Schema.Schema.AnyNoContext, filter?: Record<string, any> | OperatorFilter): Filter {
    if (!schema) {
      throw new TypeError('`schema` parameter is required.');
    }

    // TODO(dmaretskyi): Make `getReferenceWithSpaceKey` work over abstract handlers to not depend on EchoHandler directly.
    const typeReference = Schema.isSchema(schema) ? requireTypeReference(schema) : getReferenceWithSpaceKey(schema);
    invariant(typeReference, 'Invalid schema; check persisted in the database.');
    return Filter._fromTypeWithPredicate(typeReference.toDXN(), filter);
  }

  static typename(typename: string, filter?: Record<string, any> | OperatorFilter<any>): Filter<any> {
    if (!typename) {
      throw new TypeError('`typename` parameter is required.');
    }
    if (typename.startsWith('dxn:echo:')) {
      throw new TypeError('Dynamic schema references are not allowed.');
    }

    return Filter._fromTypeWithPredicate(DXN.fromTypename(typename), filter);
  }

  static typenames(typenames: string[]) {
    const dxns = typenames.map((typename) => {
      if (typename.startsWith('dxn:echo:')) {
        throw new TypeError('Dynamic schema references are not allowed.');
      }

      return DXN.fromTypename(typename);
    });

    return new Filter({ type: dxns });
  }

  static typeDXN(dxn: string): Filter {
    if (!dxn) {
      throw new TypeError('`dxn` parameter is required.');
    }
    return new Filter({ type: [DXN.parse(dxn)] });
  }

  static foreignKeys(keys: ForeignKey[]): Filter {
    return new Filter({
      metaKeys: keys,
    });
  }

  private static _fromTypeWithPredicate(type: DXN, filter?: Record<string, any> | OperatorFilter<any>) {
    switch (typeof filter) {
      case 'function':
        return new Filter({ type: [type], predicate: filter as any });
      case 'object':
        return new Filter({ type: [type], properties: filter });
      case 'undefined':
        return new Filter({ type: [type] });
      default:
        throw new TypeError('Invalid filter.');
    }
  }

  static not<T extends BaseObject = any>(source: Filter<T>): Filter<T> {
    return new Filter({ ...source, not: !source.not }, source.options);
  }

  static and<T extends BaseObject = any>(...filters: FilterSource<T>[]): Filter<T> {
    return new Filter({
      and: filters.map((filter) => Filter.from(filter)),
    });
  }

  static or<T extends BaseObject = any>(...filters: FilterSource<T>[]): Filter<T> {
    return new Filter({
      or: filters.map((filter) => Filter.from(filter)),
    });
  }

  static fromProto(proto: FilterProto): Filter {
    // NOTE(mykola): Filter expects options empty arrays to be undefined.
    const options: QueryOptions = {
      ...proto.options,
      spaces: proto.options?.spaces?.length === 0 ? undefined : proto.options?.spaces,
      models: proto.options?.models?.length === 0 ? undefined : proto.options?.models,
    };
    return new Filter(
      {
        type: proto.type?.map((type) => DXN.parse(type)),
        properties: proto.properties,
        objectIds: proto.objectIds,
        text: proto.text,
        not: proto.not,
        and: proto.and?.map((filter) => Filter.fromProto(filter)),
        or: proto.or?.map((filter) => Filter.fromProto(filter)),
        metaKeys: undefined,
        predicate: undefined,
      } satisfies Record<keyof FilterParams, any>,
      options,
    );
  }

  static fromAST(ast: QueryAST.Filter): Filter {
    switch (ast.type) {
      case 'object':
        return new Filter({
          type: ast.typename ? [DXN.fromTypename(ast.typename)] : undefined,
          properties: mapValues(ast.props, (prop) =>
            prop.type === 'compare' && prop.operator === 'eq' ? prop.value : raise(new Error('Not supported')),
          ),
        });
      case 'compare':
        throw new Error('Not implemented');

      case 'in':
        throw new Error('Not implemented');

      case 'range':
        throw new Error('Not implemented');

      case 'text-search':
        throw new Error('Not implemented');

      case 'not':
        return Filter.not(Filter.fromAST(ast.filter));

      case 'and':
        return Filter.and(ast.filters.map(Filter.fromAST));

      case 'or':
        return Filter.or(ast.filters.map(Filter.fromAST));

      default:
        throw new Error('Not implemented');
    }
  }

  // TODO(burdon): Make plain immutable object (unless generics are important).
  // TODO(burdon): Split into protobuf serializable and non-serializable (operator) predicates.

  // TODO(dmaretskyi): Support expando.
  public readonly type?: DXN[];
  public readonly properties?: Record<string, any>;
  public readonly objectIds?: string[];
  public readonly text?: string;
  public readonly metaKeys?: ForeignKey[];
  public readonly predicate?: OperatorFilter<any>;
  public readonly not: boolean;
  public readonly and: Filter[];
  public readonly or: Filter[];
  public readonly options: QueryOptions = {};

  protected constructor(params: FilterParams<T>, options: QueryOptions = {}) {
    this.type = params.type;
    this.properties = params.properties;
    this.objectIds = params.objectIds;
    this.text = params.text;
    this.metaKeys = params.metaKeys;
    this.predicate = params.predicate;
    this.not = params.not ?? false;
    this.and = params.and ?? [];
    this.or = params.or ?? [];
    this.options = options;
  }

  // TODO(burdon): toJSON.

  get spaceKeys(): PublicKey[] | undefined {
    return this.options.spaces;
  }

  get spaceIds(): SpaceId[] | undefined {
    return this.options.spaceIds as SpaceId[] | undefined;
  }

  isObjectIdFilter(): boolean {
    return this.objectIds !== undefined && this.objectIds.length > 0;
  }

  toProto(): FilterProto {
    return {
      properties: this.properties,
      objectIds: this.objectIds,
      type: this.type?.map((type) => type.toString()),
      text: this.text,
      not: this.not,
      and: this.and.map((filter) => filter.toProto()),
      or: this.or.map((filter) => filter.toProto()),
      options: this.options,
    };
  }

  toBufProto(): FilterBuf {
    return createBuf(FilterSchema, {
      properties: this.properties,
      objectIds: this.objectIds,
      type: this.type?.map((type) => type.toString()),
      text: this.text,
      not: this.not,
      and: this.and.map((filter) => filter.toBufProto()),
      or: this.or.map((filter) => filter.toBufProto()),
      options: {
        ...this.options,
        deleted: this.options.deleted as QueryOptions_ShowDeletedOption | undefined,
        dataLocation: this.options.dataLocation as QueryOptions_DataLocation | undefined,
        spaces: [],
      },
    });
  }
}

const sanitizeIdArray = (ids: string | EncodedReference | (string | EncodedReference)[]): string[] => {
  const items = Array.isArray(ids) ? ids : [ids];
  return items.map((id) => {
    if (typeof id === 'string' && !id.startsWith('dxn:')) {
      return id;
    }
    const data = isEncodedReference(id) ? id['/'] : id;
    invariant(typeof data === 'string');

    const dxn = DXN.parse(data);
    invariant(dxn.kind === DXN.kind.ECHO);
    invariant(dxn.parts[0] === LOCAL_SPACE_TAG, 'Only local space references are supported');
    return dxn.parts[1];
  });
};

export const deprecatedFilterFromQueryAST = (ast: QueryAST.Query): Filter => {
  switch (ast.type) {
    case 'select':
      return Filter.fromAST(ast.filter);
    default:
      throw new Error('Not implemented');
  }
};
