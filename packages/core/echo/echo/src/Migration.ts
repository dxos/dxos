//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import type * as Schema from 'effect/Schema';

import { type URI } from '@dxos/keys';

import type * as Database from './Database';
import type * as Entity from './Entity';
import { MetaId, type ObjectMeta, getSchemaURI } from './internal';
import * as Type from './Type';

/**
 * Result returned by a migration's `transform` callback.
 * The data shape matches the target schema; the optional `[Obj.Meta]` symbol key lets the
 * transform update the object's meta (e.g. `key` / `version`) atomically with the data swap.
 */
type MigrationSchemaInput = Type.AnyEntity;

type MigrationInstanceType<S> = S extends Type.AnyEntity
  ? Type.InstanceType<S>
  : S extends Schema.Schema.AnyNoContext
    ? Schema.Schema.Type<S>
    : never;

export type TransformResult<To> = Omit<MigrationInstanceType<To>, 'id' | Entity.KindId> & {
  [MetaId]?: Partial<ObjectMeta>;
};

type DefineObjectMigrationOptions<From extends MigrationSchemaInput, To extends MigrationSchemaInput> = {
  from: From;
  to: To;
  /**
   * Pure function that converts the old object data to the new object data.
   *
   * The returned object may include an optional `[Obj.Meta]` entry to update the object's meta
   * (e.g. registry `key` / `version`) atomically with the data swap.
   */
  // TODO(dmaretskyi): `id` should not be a part of the schema.
  transform: (from: MigrationInstanceType<From>, context: ObjectMigrationContext) => Promise<TransformResult<To>>;

  /**
   * Callback that is called after the object is migrated. Called for every object that is migrated.
   *
   * NOTE: Database mutations performed in this callback are not guaranteed to be idempotent.
   *       If multiple peers run the migration separately, the effects may be applied multiple times.
   */
  onMigration?: (params: OnMigrateProps<From, To>) => Promise<void>;
};

/**
 * Context passed to object migration callbacks.
 */
export type ObjectMigrationContext = {
  db: Database.Database;
};

type OnMigrateProps<From, To> = {
  before: MigrationInstanceType<From>;
  object: MigrationInstanceType<To>;
  db: Database.Database;
};

/**
 * Definition of a migration from one object schema version to another.
 */
export type ObjectMigration = {
  fromType: URI.URI;
  toType: URI.URI;
  fromSchema: Schema.Schema.AnyNoContext;
  toSchema: Schema.Schema.AnyNoContext;
  transform: (from: unknown, context: ObjectMigrationContext) => Promise<unknown>;
  onMigration?: (params: OnMigrateProps<any, any>) => Promise<void>;
};

/**
 * Define a migration between two object schemas.
 *
 * @example
 * ```ts
 * const migration = Migration.define({
 *   from: ContactV1,
 *   to: ContactV2,
 *   transform: async (from) => ({ name: `${from.firstName} ${from.lastName}` }),
 *   onMigration: async () => {},
 * });
 * ```
 */
export const define = <From extends MigrationSchemaInput, To extends MigrationSchemaInput>(
  options: DefineObjectMigrationOptions<From, To>,
): ObjectMigration => {
  const fromSchema = Type.getSchema(options.from);
  const toSchema = Type.getSchema(options.to);
  const fromType = getSchemaURI(fromSchema);
  if (!fromType) {
    throw new Error('Invalid from schema');
  }
  const toType = getSchemaURI(toSchema);
  if (!toType) {
    throw new Error('Invalid to schema');
  }

  return {
    fromType,
    toType,
    fromSchema,
    toSchema,
    transform: options.transform as any,
    onMigration: options.onMigration as any,
  };
};
