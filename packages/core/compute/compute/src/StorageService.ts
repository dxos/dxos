//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Pipeable from 'effect/Pipeable';
import * as Schema from 'effect/Schema';

export interface Service {
  /** Read a value by key. Returns `None` if key does not exist. */
  get<S extends Schema.Codec<any, string, any>>(
    schema: S,
    key: string,
  ): Effect.Effect<Option.Option<Schema.Schema.Type<S>>, never, S['DecodingServices']>;

  /** Write a value for the given key. */
  set<S extends Schema.Codec<any, string, any>>(
    schema: S,
    key: string,
    value: Schema.Schema.Type<S>,
  ): Effect.Effect<void, never, S['DecodingServices']>;

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
export class StorageService extends Context.Service<StorageService, Service>()('@dxos/functions/StorageService') {}

/** Re-exported so callers importing this module as a namespace avoid `StorageService.StorageService.key`. */
export const key = StorageService.key;

export const get = (...args: Parameters<Context.Service.Shape<typeof StorageService>['get']>) =>
  StorageService.use((service) => service.get(...args));
export const set = (...args: Parameters<Context.Service.Shape<typeof StorageService>['set']>) =>
  StorageService.use((service) => service.set(...args));
export const deleteKey = (...args: Parameters<Context.Service.Shape<typeof StorageService>['delete']>) =>
  StorageService.use((service) => service.delete(...args));
export const list = (...args: Parameters<Context.Service.Shape<typeof StorageService>['list']>) =>
  StorageService.use((service) => service.list(...args));
export const clear = (...args: Parameters<Context.Service.Shape<typeof StorageService>['clear']>) =>
  StorageService.use((service) => service.clear(...args));

/**
 * Typed cell in a storage service.
 */
export interface Cell<T> extends Pipeable.Pipeable {
  readonly key: string;

  get: Effect.Effect<Option.Option<T>, never, StorageService>;
  set(value: T): Effect.Effect<void, never, StorageService>;
  delete(): Effect.Effect<void, never, StorageService>;
}

/**
 * Create a typed cell in a storage service.
 */
export const cell = <S extends Schema.Codec<any, string, any>>(schema: S, key: string): Cell<Schema.Schema.Type<S>> => {
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
 * Typed cell in a storage service with a default value.
 */
export interface CellWithDefault<T, U> extends Pipeable.Pipeable {
  readonly key: string;
  get: Effect.Effect<T | U, never, StorageService>;
  set(value: U): Effect.Effect<void, never, StorageService>;
  delete(): Effect.Effect<void, never, StorageService>;
}

/**
 * Assign a default value to a cell if it is not present.
 */
export const withDefault =
  <T>(getDefault: () => NoInfer<T>) =>
  (cell: Cell<T>): CellWithDefault<T, T> => {
    return {
      key: cell.key,
      get: cell.get.pipe(Effect.map(Option.getOrElse(() => getDefault()))),
      set: (value) => cell.set(value),
      delete: () => cell.delete(),
      pipe(...args: any) {
        return Pipeable.pipeArguments(this, arguments);
      },
    };
  };
