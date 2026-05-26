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
   *  - org.dxos.type.schema
   */
  includeSystem?: boolean;
};

/**
 * Maps a {@link Query} input to the entity union produced by `query(input)`.
 *
 * Today this collapses to `Type.Type` — both `database` and `runtime` locations
 * surface as the canonical persistent type entity. The generic exists so the
 * API can later narrow on additional query shapes (e.g. a `kind` filter that
 * picks `Type.AnyObj` vs `Type.AnyRelation`) without an API break.
 */
export type ExtractQueryResult<_Q> = Type.Type;

/**
 * Input for schema registration.
 * The typename, version and schema mutability metadata is read from the schema annotations.
 *
 * Accepts:
 * - Branded ECHO schemas created with Type.Obj() or Type.Relation()
 * - JSON schema with typename and version
 */
export type RegisterSchemaInput =
  | Type.AnyEntity
  | {
      typename: string;
      version: string;
      jsonSchema: JsonSchema.JsonSchema;
      /**
       * Display name of the schema.
       */
      name?: string;
    };

// TODO(dmaretskyi): Rename TypeRegistry
export interface SchemaRegistry {
  /**
   * Checks if the provided schema is registered.
   */
  hasSchema(schema: Type.AnyEntity): boolean;

  /**
   * Registers the provided schema(s).
   *
   * @returns The persisted type entities. The entity kind of each input is
   * preserved (an object schema comes back as `Persisted<Type.AnyObj>`), so the
   * result can be chained into `Obj.make` / `Relation.make` without casts. Each
   * stored schema is also a `Type.Type` record, so its `Ref` targets a
   * `Ref(Type.Type)` field.
   *
   * The behavior of this method depends on the state of the database.
   * The general principle is that the schema will be upserted into the space.
   * If an equivalent schema with the same name and version already exists, the method does nothing.
   * If a different schema with the same name and version exists, the method throws an error.
   * If no schema with the same name and version exists, a new schema will be inserted based on semantic versioning rules.
   */
  register<T extends Type.AnyEntity>(input: T[]): Promise<Type.Persisted<T>[]>;
  register(input: RegisterSchemaInput[]): Promise<Type.PersistedType[]>;

  query<Q extends Types.NoExcessProperties<Query, Q>>(
    query?: Q & Query,
  ): QueryResult.QueryResult<ExtractQueryResult<Q>>;
}
