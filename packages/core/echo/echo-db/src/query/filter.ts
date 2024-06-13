//
// Copyright 2023 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { type Mutable } from 'effect/Types';

import { Reference } from '@dxos/echo-protocol';
import { requireTypeReference, EXPANDO_TYPENAME } from '@dxos/echo-schema';
import { type EchoReactiveObject } from '@dxos/echo-schema';
import { compositeRuntime } from '@dxos/echo-signals/runtime';
import { invariant } from '@dxos/invariant';
import { DXN, LOCAL_SPACE_TAG, SpaceId, type PublicKey } from '@dxos/keys';
import { QueryOptions, type Filter as FilterProto } from '@dxos/protocols/proto/dxos/echo/filter';

import { type ObjectCore } from '../core-db';
import { getReferenceWithSpaceKey } from '../echo-handler';
import { log } from '@dxos/log';

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

  static schema<T extends {} = any>(
    schema: S.Schema<T>,
    filter?: Record<string, any> | OperatorFilter<T>,
  ): Filter<Mutable<T>>;

  static schema(schema: S.Schema<any>, filter?: Record<string, any> | OperatorFilter): Filter {
    const typeReference = S.isSchema(schema) ? requireTypeReference(schema) : getReferenceWithSpaceKey(schema);
    invariant(typeReference, 'Invalid schema; check persisted in the database.');
    return this._fromTypeWithPredicate(typeReference, filter);
  }

  static typename(typename: string, filter?: Record<string, any> | OperatorFilter<any>): Filter<any> {
    const type = Reference.forType(typename);
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

// TODO(burdon): Move logic into Filter.
/**
 * Query logic that checks if object complaint with a filter.
 * @param echoObject used for predicate filters only.
 * @returns
 */
export const filterMatch = (
  filter: Filter,
  core: ObjectCore | undefined,
  // TODO(mykola): Remove predicate filters from this level query. Move it to higher proxy level.
  echoObject?: EchoReactiveObject<any> | undefined,
): boolean => {
  if (!core) {
    return false;
  }
  const result = filterMatchInner(filter, core, echoObject);
  // don't apply filter negation to deleted object handling, as it's part of filter options
  return filter.not && !core.isDeleted() ? !result : result;
};

const filterMatchInner = (
  filter: Filter,
  core: ObjectCore,
  echoObject?: EchoReactiveObject<any> | undefined,
): boolean => {
  const deleted = filter.options.deleted ?? QueryOptions.ShowDeletedOption.HIDE_DELETED;
  if (core.isDeleted()) {
    if (deleted === QueryOptions.ShowDeletedOption.HIDE_DELETED) {
      return false;
    }
  } else {
    if (deleted === QueryOptions.ShowDeletedOption.SHOW_DELETED_ONLY) {
      return false;
    }
  }

  if (filter.or.length) {
    for (const orFilter of filter.or) {
      if (filterMatch(orFilter, core, echoObject)) {
        return true;
      }
    }

    return false;
  }

  if (filter.type) {
    const type = core.getType();

    if (type) {
      if (!compareType(filter.type, type, core.database?.spaceId)) return false;
    } else {
      log.warn('expando type comparison is not implemented');
      // TODO(dmaretskyi): Fix me.
    }
  }

  if (filter.properties) {
    for (const key in filter.properties) {
      invariant(key !== '@type');
      const value = filter.properties[key];

      // TODO(dmaretskyi): Should `id` be allowed in filter.properties?
      const actualValue = key === 'id' ? core.id : core.getDecoded(['data', key]);

      if (actualValue !== value) {
        return false;
      }
    }
  }

  if (filter.text !== undefined) {
    const objectText = legacyGetTextForMatch(core);

    const text = filter.text.toLowerCase();
    if (!objectText.toLowerCase().includes(text)) {
      return false;
    }
  }

  // Untracked will prevent signals in the callback from being subscribed to.
  if (filter.predicate && !compositeRuntime.untracked(() => filter.predicate!(echoObject))) {
    return false;
  }

  for (const andFilter of filter.and) {
    if (!filterMatch(andFilter, core, echoObject)) {
      return false;
    }
  }

  return true;
};

// Type comparison is a bit weird due to backwards compatibility requirements.
// TODO(dmaretskyi): Deprecate `protobuf` protocol to clean this up.
export const compareType = (expected: Reference, actual: Reference, spaceId?: SpaceId) => {
  if (expected.dxn.kind === DXN.kind.TYPE && actual.dxn.kind === DXN.kind.TYPE) {
    invariant(expected.dxn.parts.length === 1 && actual.dxn.parts.length === 1);
    return expected.dxn.parts[0] === actual.dxn.parts[0];
  }

  if (expected.dxn.kind === DXN.kind.ECHO && actual.dxn.kind === DXN.kind.ECHO) {
    const resolvedSpaceId = actual.dxn.parts[0] === LOCAL_SPACE_TAG ? spaceId : (actual.dxn.parts[0] as SpaceId);
    if (!resolvedSpaceId || !SpaceId.isValid(resolvedSpaceId)) {
      log.warn('unable to compare types: invalid space id');
      return false;
    }

    return expected.dxn.parts[0] === actual.dxn.parts[0] && expected.dxn.parts[1] === actual.dxn.parts[1];
  }

  log.warn('unable to compare types: unsupported dxn kind');
  return false;
};

/**
 * @deprecated
 */
// TODO(dmaretskyi): Cleanup.
const legacyGetTextForMatch = (core: ObjectCore): string => '';
// compositeRuntime.untracked(() => {
//   if (!isTypedObject(core.rootProxy)) {
//     return '';
//   }

//   return JSON.stringify(core.rootProxy.toJSON());
// });
