//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Pipeable from 'effect/Pipeable';
import * as Schema from 'effect/Schema';

export interface Service {
  /** Read a value by key. Returns `None` if key does not exist. */
  get<S extends Schema.Schema<any, string, any>>(
    schema: S,
    key: string,
  ): Effect.Effect<Option.Option<Schema.Schema.Type<S>>, never, Schema.Schema.Context<S>>;

  /** Write a value for the given key. */
  set<S extends Schema.Schema<any, string, any>>(
    schema: S,
    key: string,
    value: Schema.Schema.Type<S>,
  ): Effect.Effect<void, never, Schema.Schema.Context<S>>;

  /** Remove a key. */
  delete(key: string): Effect.Effect<void>;

  /** List all keys, optionally filtered by prefix. */
  list(prefix?: string): Effect.Effect<readonly string[]>;

  /** Remove all keys managed by this scoped store. */
  clear(): Effect.Effect<void>;
}

/**
 * Scoped key-value storage service for processes.
 * Each process receives its own namespaced instance via the process manager.
 * Construct a live implementation with `StorageService.layer` from `@dxos/functions-runtime`.
 */
export class StorageService extends Context.Tag('@dxos/functions/StorageService')<StorageService, Service>() {}

export const get = Effect.serviceFunctionEffect(StorageService, (_) => _.get);
export const set = Effect.serviceFunctionEffect(StorageService, (_) => _.set);
export const deleteKey = Effect.serviceFunctionEffect(StorageService, (_) => _.delete);
export const list = Effect.serviceFunctionEffect(StorageService, (_) => _.list);
export const clear = Effect.serviceFunctionEffect(StorageService, (_) => _.clear);

/**
 * Typed key in a storage service.
 */
export interface Key<T> extends Pipeable.Pipeable {
  readonly key: string;

  get: Effect.Effect<Option.Option<T>, never, StorageService>;
  set(value: T): Effect.Effect<void, never, StorageService>;
  delete(): Effect.Effect<void, never, StorageService>;
}

/**
 * Create a typed key in a storage service.
 */
export const key = <S extends Schema.Schema<any, string, any>>(schema: S, key: string): Key<Schema.Schema.Type<S>> => {
  return {
    key,
    get: get(schema, key),
    set: (value: Schema.Schema.Type<S>) => set(schema, key, value),
    delete: () => deleteKey(key),
    pipe(...args: any) {
      return Pipeable.pipeArguments(this, arguments);
    },
  };
};

/**
 * Typed key in a storage service with a default value.
 */
export interface KeyWithDefault<T, U> extends Pipeable.Pipeable {
  readonly key: string;
  get: Effect.Effect<T | U, never, StorageService>;
  set(value: U): Effect.Effect<void, never, StorageService>;
  delete(): Effect.Effect<void, never, StorageService>;
}

/**
 * Assign a default value to a key if it is not present.
 */
export const withDefault =
  <T>(getDefault: () => NoInfer<T>) =>
  (key: Key<T>): KeyWithDefault<T, T> => {
    return {
      key: key.key,
      get: key.get.pipe(Effect.map(Option.getOrElse(() => getDefault()))),
      set: (value) => key.set(value),
      delete: () => key.delete(),
      pipe(...args: any) {
        return Pipeable.pipeArguments(this, arguments);
      },
    };
  };
