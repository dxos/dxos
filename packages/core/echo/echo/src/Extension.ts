// @import-as-namespace
//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import { dual } from 'effect/Function';
import * as Schema from 'effect/Schema';
import { pipe } from 'effect/Function';
import type { Mutable } from 'effect/Types';

// @import-as-namespace

/**
 * Extensions allow objects to contain typed properties that are not part of the schema.
 */

export const TypeId = '~@dxos/echo/Extension' as const;
export type TypeId = typeof TypeId;

export interface Extension<T> extends Record<
  TypeId,
  {
    _Type: T;
  }
> {
  readonly [TypeId]: {
    _Type: T;
  };

  readonly key: Key;
  readonly valueSchema: Schema.Schema<T>;
}

/**
 * Create a new typed extension.
 *
 * ```ts
 * const ColorExtension = Extension.make('color', Schema.String);
 *
 * const obj = Obj.make(Person, {
 *   [Obj.Meta]: { keys: [{ source: 'external', id: '123' }] },
 *   name: 'John',
 *   email: 'john@example.com',
 * });
 *
 * Obj.change(obj, (obj) => {
 *   Extension.set(obj.extensions, ColorExtension, 'red');
 * });
 *
 * console.log(Extension.get(obj.extensions, ColorExtension)); // 'red'
 * ```
 */
export const make = <S extends Schema.Schema.AnyNoContext>(
  key: string,
  valueSchema: S,
): Extension<Schema.Schema.Type<S>> => {
  return {
    [TypeId]: {} as any,
    key: Key.make(key),
    valueSchema,
  };
};

/**
 * Unique identifier for an extension.
 */
// TODO(dmaretskyi): filter to be fully qualified: (e.g., org.dxos.extension.color)
export const Key = Schema.String.pipe(Schema.brand('~@dxos/echo/ExtensionKey'));
export type Key = Schema.Schema.Type<typeof Key>;

/**
 * Set of extension values.
 *
 * Can be used inside an object/relation schema:
 *
 * ```ts
 * const Person = Schema.Struct({
 *   name: Schema.String,
 *   extensions: Extension.Values,
 * });
 * ```
 */
export const Values = Schema.Record({ key: Key, value: Schema.Unknown });
export interface Values extends Schema.Schema.Type<typeof Values> {}

/**
 * Get the value of an extension from a set of values.
 */
export const get: {
  <T>(extension: Extension<T>): (values: Values) => Option.Option<T>;
  <T>(values: Values, extension: Extension<T>): Option.Option<T>;
} = dual<
  <T>(extension: Extension<T>) => (values: Values) => Option.Option<T>,
  <T>(values: Values, extension: Extension<T>) => Option.Option<T>
>(2, (values, extension) => {
  if (!(extension.key in values)) {
    return Option.none();
  }

  return pipe(values[extension.key], Schema.decodeUnknownSync(extension.valueSchema), Option.some);
});

/**
 * Set the value of an extension in a set of values.
 *
 * Can also be used within Obj.change callback:
 *
 * ```ts
 * Obj.change(obj, (obj) => {
 *   Extension.set(obj.extensions, ColorExtension, 'red');
 * });
 * ```
 */
export const set: {
  <T>(extension: Extension<T>, value: T): (values: Values) => void;
  <T>(values: Mutable<Values>, extension: Extension<T>, value: T): void;
} = dual<
  <T>(extension: Extension<T>, value: T) => (values: Values) => void,
  <T>(values: Mutable<Values>, extension: Extension<T>, value: T) => void
>(3, (values, extension, value) => {
  values[extension.key] = Schema.encodeSync(extension.valueSchema)(value);
});
