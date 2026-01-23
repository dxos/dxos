//
// Copyright 2025 DXOS.org
//

import type * as Types from 'effect/Types';

import type * as JsonSchema from './JsonSchema';
import type * as Key from './Key';
import type * as QueryResult from './QueryResult';
import type * as Type from './Type';

// TODO(wittjosiah): Replace w/ Query.Query.
export type Query = {
  /**
   * Filter by schema ID.
   * Schema id is a DXN with `echo` or `type` kind.
   */
  id?: string | string[];

  /**
   * Id of the backing ECHO object.
   */
  backingObjectId?: Key.ObjectId | Key.ObjectId[];

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

/**
 * Input for schema registration.
 * The typename, version and schema mutability metadata is read from the schema annotations.
 */
export type RegisterSchemaInput =
  | Type.Entity.Any
  | {
      typename: string;
      version: string;
      jsonSchema: JsonSchema.JsonSchema;
      /**
       * Display name of the schema.
       */
      name?: string;
    };

export type ExtractQueryResult<Query> = Query extends { location: ('database' | 'runtime')[] }
  ? Type.Entity.Any
  : Type.RuntimeType;

export interface SchemaRegistry {
  /**
   * Checks if the provided schema is registered.
   */
  // TODO(burdon): Type?
  hasSchema(schema: Type.Entity.Any): boolean;

  /**
   * Registers the provided schema.
   *
   * @returns Mutable runtime instances of schemas that were registered.
   *
   * The behavior of this method depends on the state of the database.
   * The general principle is that the schema will be upserted into the space.
   * If an equivalent schema with the same name and version already exists, the method does nothing.
   * If a different schema with the same name and version exists, the method throws an error.
   * If no schema with the same name and version exists, a new schema will be inserted based on semantic versioning rules.
   */
  register(input: RegisterSchemaInput[]): Promise<Type.RuntimeType[]>;

  /**
   *
   */
  query<Q extends Types.NoExcessProperties<Query, Q>>(
    query?: Q & Query,
  ): QueryResult.QueryResult<ExtractQueryResult<Q>>;
}
