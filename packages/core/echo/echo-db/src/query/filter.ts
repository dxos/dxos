//
// Copyright 2023 DXOS.org
//

import { Schema as S } from '@effect/schema';

import { Reference } from '@dxos/echo-protocol';
import { requireTypeReference, type EchoReactiveObject } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { type PublicKey, type SpaceId } from '@dxos/keys';
import { type QueryOptions, type Filter as FilterProto } from '@dxos/protocols/proto/dxos/echo/filter';

import { getReferenceWithSpaceKey } from '../echo-handler';

export const hasType =
  <T extends EchoReactiveObject<T>>(type: { new (): T }) =>
  (object: EchoReactiveObject<any> | undefined): object is T =>
    object instanceof type;

// TODO(burdon): Operators (EQ, NE, GT, LT, IN, etc.)
export type PropertyFilter = Record<string, any>;

export type OperatorFilter<T extends {} = any> = (object: T) => boolean;

export type FilterSource<T extends {} = any> = PropertyFilter | OperatorFilter<T> | Filter<T> | string;

// TODO(burdon): Remove class.
// TODO(burdon): Disambiguate if multiple are defined (i.e., AND/OR).
export type FilterParams<T extends {} = any> = {
  type?: Reference;
  properties?: Record<string, any>;
  text?: string;
  predicate?: OperatorFilter<T>;
  not?: boolean;
  and?: Filter[];
  or?: Filter[];
};

/**
 * Filter helper types.
 */
// Dollar sign suffix notation borrowed from `effect`'s Array$.
export namespace Filter$ {
  export type Any = Filter<any>;
  export type Object<F extends Any> = F extends Filter<infer T> ? T : never;
}

export class Filter<T extends {} = any> {
  static from<T extends {}>(source?: FilterSource<T>, options?: QueryOptions): Filter<T> {
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

  // TODO(burdon): Tighten to AbstractTypedObject.
  static schema<S extends S.Schema.All>(
    schema: S,
    filter?: Record<string, any> | OperatorFilter<S.Schema.Type<S>>,
  ): Filter<S.Schema.Type<S>>;

  // TODO(burdon): Tighten to AbstractTypedObject.
  static schema(schema: S.Schema<any>, filter?: Record<string, any> | OperatorFilter): Filter {
    // TODO(dmaretskyi): Make `getReferenceWithSpaceKey` work over abstract handlers to not depend on EchoHandler directly.
    const typeReference = S.isSchema(schema) ? requireTypeReference(schema) : getReferenceWithSpaceKey(schema);
    invariant(typeReference, 'Invalid schema; check persisted in the database.');
    return this._fromTypeWithPredicate(typeReference, filter);
  }

  static typename(typename: string, filter?: Record<string, any> | OperatorFilter<any>): Filter<any> {
    const type = Reference.fromLegacyTypename(typename);
    return this._fromTypeWithPredicate(type, filter);
  }

  private static _fromTypeWithPredicate(type: Reference, filter?: Record<string, any> | OperatorFilter<any>) {
    switch (typeof filter) {
      case 'function':
        return new Filter({ type, predicate: filter as any });
      case 'object':
        return new Filter({ type, properties: filter });
      case 'undefined':
        return new Filter({ type });
      default:
        throw new TypeError('Invalid filter.');
    }
  }

  static not<T extends {} = any>(source: Filter<T>): Filter<T> {
    return new Filter({ ...source, not: !source.not }, source.options);
  }

  static and<T extends {} = any>(...filters: FilterSource<T>[]): Filter<T> {
    return new Filter({
      and: filters.map((filter) => Filter.from(filter)),
    });
  }

  static or<T extends {} = any>(...filters: FilterSource<T>[]): Filter<T> {
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
        type: proto.type ? Reference.fromValue(proto.type) : undefined,
        properties: proto.properties,
        text: proto.text,
        not: proto.not,
        and: proto.and?.map((filter) => Filter.fromProto(filter)),
        or: proto.or?.map((filter) => Filter.fromProto(filter)),
      },
      options,
    );
  }

  // TODO(burdon): Make plain immutable object (unless generics are important).
  // TODO(burdon): Split into protobuf serializable and non-serializable (operator) predicates.

  // TODO(dmaretskyi): Support expando.
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
    return this.options.spaces;
  }

  get spaceIds(): SpaceId[] | undefined {
    return this.options.spaceIds as SpaceId[] | undefined;
  }

  toProto(): FilterProto {
    return {
      properties: this.properties,
      type: this.type?.encode(),
      text: this.text,
      not: this.not,
      and: this.and.map((filter) => filter.toProto()),
      or: this.or.map((filter) => filter.toProto()),
      options: this.options,
    };
  }
}
