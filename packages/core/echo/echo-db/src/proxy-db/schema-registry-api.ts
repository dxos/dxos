//
// Copyright 2024 DXOS.org
//

import type * as Schema from 'effect/Schema';
import type * as Types from 'effect/Types';

import { type CleanupFn } from '@dxos/async';
import { type JsonSchema } from '@dxos/echo';
import { type EchoSchema } from '@dxos/echo/internal';
import { type ObjectId } from '@dxos/keys';

export type SchemaSubscriptionCallback = (schema: EchoSchema[]) => void;

/**
 * String identifier for the schema.
 * In practice it's an `echo` or `type` DXN.
 */
export type SchemaId = string & { __SchemaId: never };

// TODO(dmaretskyi): Change to Schema.Struct instance.
export type AnyEchoObjectSchema = Schema.Schema.AnyNoContext;
// export type AnyEchoObjectSchema = Schema.Struct<{ [key: string]: Schema.Schema.AnyNoContext }>;

export type ExtractSchemaQueryResult<Query> = Query extends { location: ('database' | 'runtime')[] }
  ? Schema.Schema.AnyNoContext
  : EchoSchema;

export interface SchemaRegistry {
  query<Query extends Types.NoExcessProperties<SchemaRegistryQuery, Query>>(
    query?: Query & SchemaRegistryQuery,
  ): SchemaRegistryPreparedQuery<ExtractSchemaQueryResult<Query>>;

  /**
   * Registers the provided schema.
   *
   * @returns Schema records after registration.
   *
   * The behavior of this method depends on the state of the database.
   * The general principle is that the schema will be upserted into the space.
   * If an equivalent schema with the same name and version already exists, the method does nothing.
   * If a different schema with the same name and version exists, the method throws an error.
   * If no schema with the same name and version exists, a new schema will be inserted based on semantic versioning rules.
   */
  register(input: RegisterSchemaInput[]): Promise<EchoSchema[]>;
}

// TODO(burdon): Could this use the smae ECHO object query/result interface?
export type SchemaRegistryQuery = {
  /**
   * Filter by schema ID.
   * Schema id is a DXN with `echo` or `type` kind.
   */
  id?: string | string[];

  /**
   * Id of the backing ECHO object.
   */
  backingObjectId?: ObjectId | ObjectId[];

  /**
   * One or more typenames to filter by.
   */
  typename?: string | string[];

  /**
   * [Semver Range](https://docs.npmjs.com/cli/v6/using-npm/semver#ranges) for the schema version.
   */
  version?: string;

  /**
   * Where to look for the schema.
   *
   * Database schema are stored in the database of the current space.
   * Runtime schema are registered in the runtime.
   *
   * @default ['database']
   */
  location?: ('database' | 'runtime')[];

  /**
   * Include system schemas.
   * @default false
   *
   * The system schema include but are not limited to:
   *  - dxos.org/type/Schema
   */
  includeSystem?: boolean;
};

export interface SchemaRegistryPreparedQuery<T> {
  /**
   * Returns query results synchronously.
   * @reactive Supports signals notifications.
   * @throws If `subscribe` has not been called.
   */
  get results(): T[];

  /**
   * Runs the query synchronously and returns all results.
   * WARNING: This method will only return the data already cached and may return incomplete results.
   * Use `this.run()` for a complete list of results stored on-disk.
   */
  runSync(): T[];

  /**
   * Runs the query and returns all results.
   */
  run(): Promise<T[]>;

  /**
   * Runs the query and returns first result.
   *
   * @throws If query returns 0 entries.
   */
  first(): Promise<T>;

  /**
   * Runs the query and returns first result.
   *
   * @returns `undefined` if query returns 0 entries.
   */
  firstOrUndefined(): Promise<T | undefined>;

  /**
   * Subscribe to the query results reactively.
   * Enables signals notifications for `results`.
   */
  subscribe(cb?: (self: this) => void, opts?: { fire?: boolean }): CleanupFn;
}

/**
 * Input for schema registration.
 * The typename, version and schema mutability metadata is read from the schema annotations.
 */
export type RegisterSchemaInput =
  | AnyEchoObjectSchema
  | {
      typename: string;
      version: string;
      jsonSchema: JsonSchema.JsonSchema;
      /**
       * Display name of the schema.
       */
      name?: string;
    };
