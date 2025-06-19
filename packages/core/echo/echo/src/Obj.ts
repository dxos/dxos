//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import * as EchoSchema from '@dxos/echo-schema';
import { assertArgument, invariant } from '@dxos/invariant';
import { type DXN } from '@dxos/keys';
import * as LiveObject from '@dxos/live-object';

import type * as Ref from './Ref';

export type Any = EchoSchema.AnyEchoObject;

export const make = LiveObject.live;

// TODO(dmaretskyi): Currently broken
export const isObject = (obj: unknown): obj is Any => {
  return LiveObject.isLiveObject(obj);
};

/**
 * Test if object or relation is an instance of a schema.
 * @example
 * ```ts
 * const person = Obj.make(Person, { name: 'John' });
 * const isPerson = Obj.instanceOf(Person)(pseron);
 * ```
 */
export const instanceOf = EchoSchema.isInstanceOf;

// TODO(burdon): Remove overloaded version since it erases the type information.
// export const instanceOf: {
//   <S extends Type.Relation.Any | Type.Obj.Any>(schema: S): (value: unknown) => value is S;
//   <S extends Type.Relation.Any | Type.Obj.Any>(schema: S, value: unknown): value is S;
// } = ((...args: any[]) => {
//   if (args.length === 1) {
//     return (obj: unknown) => EchoSchema.isInstanceOf(args[0], obj);
//   }

//   return EchoSchema.isInstanceOf(args[0], args[1]);
// }) as any;

export const getSchema = EchoSchema.getSchema;

// TODO(dmaretskyi): Allow returning undefined.
export const getDXN = (obj: Any): DXN => {
  assertArgument(!Schema.isSchema(obj), 'Object should not be a schema.');
  const dxn = EchoSchema.getObjectDXN(obj);
  invariant(dxn != null, 'Invalid object.');
  return dxn;
};

/**
 * @returns The DXN of the object's type.
 * @example dxn:example.com/type/Contact:1.0.0
 */
// TODO(dmaretskyi): Allow returning undefined.
export const getSchemaDXN = (obj: Any): DXN => {
  const type = EchoSchema.getType(obj);
  invariant(type != null, 'Invalid object.');
  return type;
};

/**
 * @returns The typename of the object's type.
 * @example `example.com/type/Contact`
 */
export const getTypename = (obj: Any): string | undefined => {
  const schema = getSchema(obj);
  if (schema == null) {
    // Try to extract typename from DXN.
    return getSchemaDXN(obj)?.asTypeDXN()?.type;
  }

  return EchoSchema.getSchemaTypename(schema);
};

// TODO(dmaretskyi): Allow returning undefined.
export const getMeta = (obj: Any): EchoSchema.ObjectMeta => {
  const meta = EchoSchema.getMeta(obj);
  invariant(meta != null, 'Invalid object.');
  return meta;
};

// TODO(dmaretskyi): Default to `false`.
export const isDeleted = (obj: Any): boolean => {
  const deleted = EchoSchema.isDeleted(obj);
  invariant(typeof deleted === 'boolean', 'Invalid object.');
  return deleted;
};

export const getLabel = (obj: Any): string | undefined => {
  const schema = getSchema(obj);
  if (schema != null) {
    return EchoSchema.getLabel(schema, obj);
  }
};

/**
 * JSON representation of an object.
 */
// TODO(burdon): Reconcile with JsonSchemaType.
export type JSON = EchoSchema.ObjectJSON;

/**
 * Converts object to it's JSON representation.
 *
 * The same algorithm is used when calling the standard `JSON.stringify(obj)` function.
 */
export const toJSON = (obj: Any): JSON => EchoSchema.objectToJSON(obj);

/**
 * Creates an object from it's json representation.
 * Performs schema validation.
 * References and schema will be resolvable if the `refResolver` is provided.
 *
 * The function need to be async to support resolving the schema as well as the relation endpoints.
 */
export const fromJSON: (json: unknown, options?: { refResolver?: Ref.Resolver }) => Promise<Any> =
  EchoSchema.objectFromJSON;
