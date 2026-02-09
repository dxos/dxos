//
// Copyright 2024 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { type TypeMeta } from '../annotations';
import { type AnyEntity } from '../types';

/**
 * Definition for an object type that can be stored in an ECHO database.
 * Implements effect schema to define object properties.
 * Has a typename and version.
 *
 * In contrast to {@link EchoSchema} this definition is not recorded in the database.
 *
 * @deprecated Use `Type.Obj.Any` from `@dxos/echo` instead.
 */
export interface TypedObject<A = any, I = any> extends TypeMeta, Schema.Schema<A, I> {}

/**
 * Typed object that could be used as a prototype in class definitions.
 * This is an internal API type.
 *
 * @deprecated Use `Type.Obj.Any` from `@dxos/echo` instead.
 */
export interface TypedObjectPrototype<A = any, I = any> extends TypedObject<A, I> {
  /** Type constructor. */
  new (): AnyEntity & A;
}
