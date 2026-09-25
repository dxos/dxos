//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import type * as Schema from 'effect/Schema';

import { DXN, type URI } from '@dxos/keys';

import type * as Database from './Database.ts';
import type * as Entity from './Entity.ts';
import { type EntityMeta, MetaId, getSchemaURI } from './internal/index.ts';
import * as Type from './Type.ts';

export const TypeId = '~@dxos/echo/Migration' as const;
export type TypeId = typeof TypeId;

/**
 * Base of every migration definition.
 */
export interface Migration {
  readonly [TypeId]: TypeId;
  readonly kind: 'object' | 'rename';
}

/**
 * Type guard for values produced by {@link define} / {@link defineRename}.
 */
export const isMigration = (value: unknown): value is Migration => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as { [TypeId]?: unknown; kind?: unknown };
  // `kind` is checked too: a branded value carrying an unknown kind is not a migration any
  // consumer can dispatch on.
  return candidate[TypeId] === TypeId && (candidate.kind === 'object' || candidate.kind === 'rename');
};

/**
 * Result returned by a migration's `transform` callback.
 * The data shape matches the target schema; the optional `[Obj.Meta]` symbol key lets the
 * transform update the object's meta (e.g. `key` / `version`) atomically with the data swap.
 */
type MigrationSchemaInput = Type.AnyEntity;

type MigrationInstanceType<S extends MigrationSchemaInput> = Type.InstanceType<S>;

export type TransformResult<To extends MigrationSchemaInput> = Omit<MigrationInstanceType<To>, 'id' | Entity.KindId> & {
  [MetaId]?: Partial<EntityMeta>;
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

type OnMigrateProps<From extends MigrationSchemaInput, To extends MigrationSchemaInput> = {
  before: MigrationInstanceType<From>;
  object: MigrationInstanceType<To>;
  db: Database.Database;
};

/**
 * Definition of a migration from one object schema version to another.
 */
export interface ObjectMigration extends Migration {
  readonly kind: 'object';
  fromType: URI.URI;
  toType: URI.URI;
  fromSchema: Schema.Codec<any, any>;
  toSchema: Schema.Codec<any, any>;
  transform: (from: unknown, context: ObjectMigrationContext) => Promise<unknown>;
  onMigration?: (params: OnMigrateProps<any, any>) => Promise<void>;
}

/**
 * Narrows a migration to an {@link ObjectMigration}.
 */
export const isObjectMigration = (migration: Migration): migration is ObjectMigration => migration.kind === 'object';

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
    [TypeId]: TypeId,
    kind: 'object',
    fromType,
    toType,
    fromSchema,
    toSchema,
    transform: options.transform as any,
    onMigration: options.onMigration as any,
  };
};

/**
 * Compile-time validation of an NSID passed to {@link defineRename}, mirroring `DXN.make`.
 */
type ValidName<T extends string> = [DXN.Name<T>] extends [never]
  ? `Invalid NSID "${T}": final segment must be camelCase (no hyphens)`
  : T;

/**
 * Definition of a rename of a named entity, repointing every `dxn:` reference to the old name.
 */
export interface RenameMigration extends Migration {
  readonly kind: 'rename';

  /** DXN of the old name (unversioned). */
  from: DXN.DXN;

  /** DXN of the new name (unversioned). */
  to: DXN.DXN;
}

/**
 * Narrows a migration to a {@link RenameMigration}.
 */
export const isRenameMigration = (migration: Migration): migration is RenameMigration => migration.kind === 'rename';

/**
 * Define a migration that renames a named entity.
 *
 * Applying it rewrites every reference pointing at `from` to point at `to`, preserving the
 * reference's version suffix. Idempotent: a reference that already reads correctly is not written.
 *
 * @example
 * ```ts
 * const migration = Migration.defineRename({
 *   from: 'org.example.operation.foo',
 *   to: 'org.example.operation.bar',
 * });
 * ```
 */
export const defineRename = <const From extends string, const To extends string>(options: {
  from: ValidName<From>;
  to: ValidName<To>;
}): RenameMigration => ({
  [TypeId]: TypeId,
  kind: 'rename',
  from: DXN.make<string>(options.from),
  to: DXN.make<string>(options.to),
});
