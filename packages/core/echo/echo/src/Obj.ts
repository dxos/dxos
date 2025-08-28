//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import * as EchoSchema from '@dxos/echo/internal';
import { assertArgument, invariant } from '@dxos/invariant';
import { type DXN } from '@dxos/keys';
import type * as LiveObject from '@dxos/live-object';
import { live } from '@dxos/live-object';
import { assumeType } from '@dxos/util';

import type * as Ref from './Ref';
import type * as Relation from './Relation';
import type * as Type from './Type';

/**
 * NOTE: Don't export: Obj.Any and Obj.Obj form the public API.
 */
interface BaseObj extends EchoSchema.HasId, Type.OfKind<EchoSchema.EntityKind.Object> {}

/**
 * Object type with specific properties.
 */
export type Obj<Props> = BaseObj & Props;

/**
 * Base type for all ECHO objects.
 */
export interface Any extends BaseObj {}

type Props<T = any> = { id?: EchoSchema.ObjectId } & Type.Properties<T>;

export type MakeProps<T extends Type.Obj.Any> = NoInfer<Props<Schema.Schema.Type<T>>>;

/**
 * Creates new object.
 */
// TODO(dmaretskyi): Move meta into props.
export const make = <S extends Type.Obj.Any>(
  schema: S,
  props: MakeProps<S>,
  meta?: EchoSchema.ObjectMeta,
): LiveObject.Live<Schema.Schema.Type<S>> => {
  assertArgument(
    EchoSchema.getTypeAnnotation(schema)?.kind === EchoSchema.EntityKind.Object,
    'Expected an object schema',
  );

  if (props[EchoSchema.MetaId] != null) {
    meta = props[EchoSchema.MetaId] as any;
    delete props[EchoSchema.MetaId];
  }

  return live<Schema.Schema.Type<S>>(schema, props as any, meta);
};

export const isObject = (obj: unknown): obj is Any => {
  assumeType<EchoSchema.InternalObjectProps>(obj);
  return typeof obj === 'object' && obj !== null && obj[EchoSchema.EntityKindId] === EchoSchema.EntityKind.Object;
};

/**
 * Test if object or relation is an instance of a schema.
 * @example
 * ```ts
 * const john = Obj.make(Person, { name: 'John' });
 * const johnIsPerson = Obj.instanceOf(Person)(john);
 *
 * const isPerson = Obj.instanceOf(Person);
 * if(isPerson(john)) {
 *   // john is Person
 * }
 * ```
 */
export const instanceOf: {
  <S extends Type.Relation.Any | Type.Obj.Any>(schema: S): (value: unknown) => value is Schema.Schema.Type<S>;
  <S extends Type.Relation.Any | Type.Obj.Any>(schema: S, value: unknown): value is Schema.Schema.Type<S>;
} = ((
  ...args: [schema: Type.Relation.Any | Type.Obj.Any, value: unknown] | [schema: Type.Relation.Any | Type.Obj.Any]
) => {
  if (args.length === 1) {
    return (obj: unknown) => EchoSchema.isInstanceOf(args[0], obj);
  }

  return EchoSchema.isInstanceOf(args[0], args[1]);
}) as any;

export const getSchema = EchoSchema.getSchema;

// TODO(dmaretskyi): Allow returning undefined.
export const getDXN = (obj: Any | Relation.Any): DXN => {
  assertArgument(!Schema.isSchema(obj), 'Object should not be a schema.');
  const dxn = EchoSchema.getObjectDXN(obj);
  invariant(dxn != null, 'Invalid object.');
  return dxn;
};

/**
 * @returns The DXN of the object's type.
 * @example dxn:example.com/type/Contact:1.0.0
 */
// TODO(burdon): Expando does not have a type.
export const getTypeDXN = EchoSchema.getType;

/**
 * @returns The typename of the object's type.
 * @example `example.com/type/Contact`
 */
export const getTypename = (obj: Any | Relation.Any): string | undefined => {
  const schema = getSchema(obj);
  if (schema == null) {
    // Try to extract typename from DXN.
    return EchoSchema.getType(obj)?.asTypeDXN()?.type;
  }

  return EchoSchema.getSchemaTypename(schema);
};

// TODO(dmaretskyi): Allow returning undefined.
export const getMeta = (obj: Any | Relation.Any): EchoSchema.ObjectMeta => {
  const meta = EchoSchema.getMeta(obj);
  invariant(meta != null, 'Invalid object.');
  return meta;
};

// TODO(dmaretskyi): Default to `false`.
export const isDeleted = (obj: Any | Relation.Any): boolean => {
  const deleted = EchoSchema.isDeleted(obj);
  invariant(typeof deleted === 'boolean', 'Invalid object.');
  return deleted;
};

// TODO(burdon): Rename "label"
export const getLabel = (obj: Any | Relation.Any): string | undefined => {
  const schema = getSchema(obj);
  if (schema != null) {
    return EchoSchema.getLabel(schema, obj);
  }
};

export const setLabel = (obj: Any | Relation.Any, label: string) => {
  const schema = getSchema(obj);
  if (schema != null) {
    EchoSchema.setLabel(schema, obj, label);
  }
};

/**
 * JSON representation of an object.
 */
export type JSON = EchoSchema.ObjectJSON;

/**
 * Converts object to its JSON representation.
 *
 * The same algorithm is used when calling the standard `JSON.stringify(obj)` function.
 */
// TODO(burdon): Base util type for Obj/Relation?
export const toJSON = (obj: Any | Relation.Any): JSON => EchoSchema.objectToJSON(obj);

/**
 * Creates an object from its json representation, performing schema validation.
 * References and schemas will be resolvable if the `refResolver` is provided.
 *
 * The function need to be async to support resolving the schema as well as the relation endpoints.
 *
 * @param options.refResolver - Resolver for references. Produces hydrated references that can be resolved.
 * @param options.dxn - Override object DXN. Changes the result of `Obj.getDXN`.
 */
export const fromJSON: (json: unknown, options?: { refResolver?: Ref.Resolver; dxn?: DXN }) => Promise<Any> =
  EchoSchema.objectFromJSON as any;

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
export const clone = <T extends Any | Relation.Any>(obj: T, opts?: CloneOptions): T => {
  const { id, ...data } = obj;
  const schema = getSchema(obj);
  invariant(schema != null, 'Object should have a schema');
  const props: any = { ...data };
  if (opts?.retainId) {
    props.id = id;
  }
  return make(schema, props);
};
