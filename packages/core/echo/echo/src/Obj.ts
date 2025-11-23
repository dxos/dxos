//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { assertArgument, invariant } from '@dxos/invariant';
import { type ObjectId } from '@dxos/keys';
import { type Live, getSnapshot as getSnapshot$ } from '@dxos/live-object';
import { assumeType, deepMapValues } from '@dxos/util';

import {
  type AnyEchoObject,
  EntityKind,
  EntityKindId,
  type InternalObjectProps,
  MetaId,
  type ObjectMeta,
  getMeta,
  getSchema,
  getTypeAnnotation,
  makeObject,
} from './internal';
import * as Ref from './Ref';
import * as Type from './Type';

/**
 * Export common entity defs.
 */
export * from './Entity';

/**
 * Base interface for all objects..
 */
interface BaseObj extends AnyEchoObject, Type.OfKind<EntityKind.Object> {}

/**
 * Object type with specific properties.
 */
export type Obj<Props> = BaseObj & Props;

/**
 * Base type for all ECHO objects.
 * This type does not define any properties.
 */
export interface Any extends BaseObj {}

/**
 * Object with arbitrary properties.
 *
 * NOTE: Due to how typescript works, this type is not assignable to a specific schema type.
 * In that case, use `Obj.instanceOf` to check if an object is of a specific type.
 */
export interface AnyProps extends BaseObj {
  [key: string]: any;
}

export const Any = Schema.Struct({}).pipe(
  Type.Obj({
    typename: 'dxos.org/types/Any',
    version: '0.1.0',
  }),
);

type Props<T = any> = { id?: ObjectId; [MetaId]?: ObjectMeta } & Type.Properties<T>;

const defaultMeta: ObjectMeta = {
  keys: [],
};

export type MakeProps<T extends Type.Obj.Any> = {
  id?: ObjectId;
  [MetaId]?: ObjectMeta;
} & NoInfer<Props<Schema.Schema.Type<T>>>;

/**
 * Creates a new object of the given types.
 * @param schema - Object schema.
 * @param props - Object properties.
 * @param meta - Object metadata (deprecated) -- pass with Obj.Meta.
 *
 * Meta can be passed as a symbol in `props`.
 *
 * Example:
 * ```ts
 * const obj = Obj.make(Person, { [Obj.Meta]: { keys: [...] }, name: 'John' });
 * ```
 */
export const make = <S extends Type.Obj.Any>(
  schema: S,
  props: MakeProps<S>,
  meta?: Partial<ObjectMeta>,
): Live<Schema.Schema.Type<S>> => {
  assertArgument(getTypeAnnotation(schema)?.kind === EntityKind.Object, 'schema', 'Expected an object schema');

  // Set default fields on meta on creation.
  if (props[MetaId] != null) {
    meta = { ...structuredClone(defaultMeta), ...props[MetaId] };
    delete props[MetaId];
  }

  // Filter undefined values.
  const filterUndefined = Object.fromEntries(Object.entries(props).filter(([_, v]) => v !== undefined));

  return makeObject<Schema.Schema.Type<S>>(schema, filterUndefined as any, {
    ...defaultMeta,
    ...meta,
  });
};

/**
 * Determine if object is an ECHO object.
 */
export const isObject = (obj: unknown): obj is Any => {
  assumeType<InternalObjectProps>(obj);
  return typeof obj === 'object' && obj !== null && obj[EntityKindId] === EntityKind.Object;
};

//
// Snapshot
//

/**
 * Returns an immutable snapshot of an object.
 */
export const getSnapshot: <T extends Any>(obj: Obj<T>) => T = getSnapshot$;

export type CloneOptions = {
  /**
   * Retain the original object's ID.
   * @default false
   */
  retainId?: boolean;
};

/**
 * Clones an object or relation.
 * This does not clone referenced objects, only the properties in the object.
 * @returns A new object with the same schema and properties.
 */
export const clone = <T extends Any>(obj: T, opts?: CloneOptions): T => {
  const { id, ...data } = obj;
  const schema = getSchema(obj);
  invariant(schema != null, 'Object should have a schema');
  const props: any = deepMapValues(data, (value, recurse) => {
    if (Ref.isRef(value)) {
      return value;
    }
    return recurse(value);
  });

  if (opts?.retainId) {
    props.id = id;
  }
  const meta = getMeta(obj);
  props[MetaId] = deepMapValues(meta, (value, recurse) => {
    if (Ref.isRef(value)) {
      return value;
    }
    return recurse(value);
  });

  return make(schema, props);
};
