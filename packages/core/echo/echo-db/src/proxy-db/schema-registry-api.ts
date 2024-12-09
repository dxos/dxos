//
// Copyright 2024 DXOS.org
//

import { type UnsubscribeCallback } from '@dxos/async';
import { type JsonSchemaType, MutableSchema, type S, StoredSchema } from '@dxos/echo-schema';

import { type ReactiveEchoObject } from '../echo-handler';

export type SchemaSubscriptionCallback = (schema: MutableSchema[]) => void;

export interface SchemaRegistry {
  query(query: SchemaRegistryQuery): SchemaRegistryPreparedQuery<SchemaRecord>;

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
  register(input: RegisterSchemaInput[]): Promise<SchemaRecord[]>;

  /**
   * @deprecated Use `query()`.
   */
  getSchema(typename: string): MutableSchema | undefined;

  /**
   * @deprecated Use `query()`.
   */
  subscribe(cb: SchemaSubscriptionCallback): UnsubscribeCallback;
}

export type SchemaRegistryQuery = {
  /**
   * Filter by schema ID.
   * Schema id is a DXN with `echo` or `type` kind.
   */
  id?: string[];

  /**
   * One or more typenames to filter by.
   */
  typename?: string[];

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

// TODO(dmaretskyi): Change to S.Struct instance.
export type AnyEchoObjectSchema = S.Schema.AnyNoContext;
// export type AnyEchoObjectSchema = S.Struct<{ [key: string]: S.Schema.AnyNoContext }>;

/**
 * String identifier for the schema.
 * In practice it's an `echo` or `type` DXN.
 */
export type SchemaId = string & { __SchemaId: never };

/**
 * Record of the schema stored in the registry
 */
// TODO(dmaretskyi): Replaces MutableSchema, StaticSchema.
export interface SchemaRecord {
  /**
   * String identifier for the schema.
   * In practice it's an `echo` or `type` DXN.
   */
  get id(): SchemaId;

  get mutable(): boolean;

  /**
   * @returns Rendered effect schema snapshot for this entry.
   */
  getSchema(): AnyEchoObjectSchema;

  /**
   * @returns This schema snapshot in JSON-schema format.
   */
  getJsonSchema(): JsonSchemaType;

  /**
   * Get backing ECHO object for this schema.
   */
  getBackingObject(): Promise<ReactiveEchoObject<StoredSchema> | undefined>;

  /**
   * Updates typename.
   *
   * @throws Error if schema is not mutable.
   */
  updateTypename(typename: string): Promise<void>;

  /**
   * Adds fields.
   *
   * @throws Error if schema is not mutable.
   */
  addFields(fields: S.Struct.Fields): Promise<void>;

  /**
   * Updates fields.
   *
   * @throws Error if schema is not mutable.
   */
  updateFields(fields: S.Struct.Fields): Promise<void>;

  /**
   * Renames field.
   *
   * @throws Error if schema is not mutable.
   */
  renameField({ from, to }: { from: string; to: string }): Promise<void>;

  /**
   * Removes fields.
   *
   * @throws Error if schema is not mutable.
   */
  removeFields(fieldNames: string[]): Promise<void>;
}

export type MutableSchemaRegistryOptions = {
  /**
   * Run a reactive query for dynamic schemas.
   * @default true
   */
  reactiveQuery?: boolean;
};
