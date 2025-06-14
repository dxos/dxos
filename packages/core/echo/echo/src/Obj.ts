//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import * as EchoSchema from '@dxos/echo-schema';
import { assertArgument, invariant } from '@dxos/invariant';
import type { DXN } from '@dxos/keys';
import * as LiveObject from '@dxos/live-object';

import type * as Type from './Type';

export type Any = EchoSchema.AnyEchoObject;

export const make = LiveObject.live;

// TODO(dmaretskyi): Currently broken
export const isObject = (obj: unknown): obj is Any => {
  return LiveObject.isLiveObject(obj);
};

/**
 * Check that object or relation is an instance of a schema.
 * @example
 * ```ts
 * const person = Obj.make(Person, { name: 'John' });
 * const isPerson = Obj.instanceOf(Person);
 * isPerson(person); // true
 * ```
 */
export const instanceOf: {
  <S extends Type.Relation.Any | Type.Obj.Any>(schema: S): (value: unknown) => value is S;
  <S extends Type.Relation.Any | Type.Obj.Any>(schema: S, value: unknown): value is S;
} = ((...args: any[]) => {
  if (args.length === 1) {
    return (obj: unknown) => EchoSchema.isInstanceOf(args[0], obj);
  }

  return EchoSchema.isInstanceOf(args[0], args[1]);
}) as any;

export const getSchema = EchoSchema.getSchema;

export const getDXN = (obj: Any): DXN => {
  assertArgument(!Schema.isSchema(obj), 'Object should not be a schema.');
  const dxn = EchoSchema.getDXN(obj);
  invariant(dxn != null, 'Invalid object.');
  return dxn;
};

/**
 * @returns The DXN of the object's type.
 * @example dxn:example.com/type/Contact:1.0.0
 */
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

  return EchoSchema.getTypename(schema);
};

export const getMeta = (obj: Any): EchoSchema.ObjectMeta => {
  const meta = EchoSchema.getMeta(obj);
  invariant(meta != null, 'Invalid object.');
  return meta;
};

export const isDeleted = (obj: Any): boolean => {
  const deleted = EchoSchema.isDeleted(obj);
  invariant(typeof deleted === 'boolean', 'Invalid object.');
  return deleted;
};
