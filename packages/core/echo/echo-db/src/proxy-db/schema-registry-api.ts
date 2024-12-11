//
// Copyright 2024 DXOS.org
//

import { type UnsubscribeCallback } from '@dxos/async';
import { type JsonSchemaType, type MutableSchema, type ObjectId, type S } from '@dxos/echo-schema';

export type SchemaSubscriptionCallback = (schema: MutableSchema[]) => void;

/**
 * String identifier for the schema.
 * In practice it's an `echo` or `type` DXN.
 */
export type SchemaId = string & { __SchemaId: never };

// TODO(dmaretskyi): Change to S.Struct instance.
export type AnyEchoObjectSchema = S.Schema.AnyNoContext;
// export type AnyEchoObjectSchema = S.Struct<{ [key: string]: S.Schema.AnyNoContext }>;

export interface SchemaRegistry {
  query(query?: SchemaRegistryQuery): SchemaRegistryPreparedQuery<MutableSchema>;

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
  register(input: RegisterSchemaInput[]): Promise<MutableSchema[]>;
}

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
};

export interface SchemaRegistryPreparedQuery<T> {
  /**
   * Returns query results synchronously.
   * Supports signals notifications.
   * User must call `subscribe` for reactive notifications to be enabled.
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
   * Subscribe to the query results reactively.
   * Enables signals notifications for `results`.
   */
  subscribe(cb?: (self: this) => void, opts?: { fire?: boolean }): UnsubscribeCallback;
}

/**
 * Input for schema registration.
 * Either one of the schema variants must be provided.
 * The typename, version and schema mutability metadata is read from the schema annotations.
 */
export type RegisterSchemaInput = {
  /**
   * Schema to register in the Effect format.
   */
  schema?: AnyEchoObjectSchema;

  /**
   * Schema to register in the JSON Schema format.
   */
  jsonSchema?: JsonSchemaType;
};

export type MutableSchemaRegistryOptions = {
  /**
   * Run a reactive query for dynamic schemas.
   * @default true
   */
  reactiveQuery?: boolean;
};
