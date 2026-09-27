//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, type URI } from '@dxos/keys';

import * as Annotation from './Annotation.ts';
import type * as Database from './Database.ts';
import type * as Entity from './Entity.ts';
import { type EntityMeta, MetaId, getSchemaURI } from './internal/index.ts';
import * as Lens from './Lens.ts';
import * as Obj from './Obj.ts';
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
  /** The lens {@link fromLens} derived this migration from, for the fold-forward runner to reuse. Absent for a hand-written `transform`. */
  lens?: Lens.Any;
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
 * Options for {@link fromLens}.
 */
export type FromLensOptions = {
  /**
   * Source properties the lens is allowed to drop (`Lens.coverage(lens).dropped`). Any dropped
   * property not listed here fails the migration's definition, so a loss the author did not
   * anticipate is a definition-time error rather than a silent omission.
   */
  allowDropped?: readonly string[];
  /**
   * Callback that is called after the object is migrated. Called for every object that is migrated.
   *
   * NOTE: Database mutations performed in this callback are not guaranteed to be idempotent.
   *       If multiple peers run the migration separately, the effects may be applied multiple times.
   */
  onMigration?: (params: OnMigrateProps<any, any>) => Promise<void>;
};

/**
 * Define an object migration whose `transform` is a lens's `get`: the lens's source and target
 * become the migration's `from`/`to`, and the target view (including any overlay value promoted
 * into a real target property) becomes the transform output.
 *
 * Unlike {@link define}, the loss a mapping causes is checked before the migration ever runs:
 * a dropped source property fails unless it is named in `allowDropped`, a suspicious (same-name,
 * incompatible-type) mapping always fails, and the lens's `GetPut` law is re-checked against every
 * object right before its transform output is computed.
 *
 * @example
 * ```ts
 * const migration = Migration.fromLens(taskAsGtd, { allowDropped: ['legacyNote'] });
 * ```
 */
export const fromLens = (lens: Lens.Any, options: FromLensOptions = {}): ObjectMigration => {
  const { target } = lens;
  if (!Type.isType(target)) {
    throw new Error(
      `Migration.fromLens: "${lens.id}" targets a plain schema; a migration target must be a declared ECHO object type.`,
    );
  }

  const fromSchema = Type.getSchema(lens.source);
  const toSchema = Type.getSchema(target);
  const fromType = getSchemaURI(fromSchema);
  if (!fromType) {
    throw new Error(`Migration.fromLens: "${lens.id}" has an invalid source schema.`);
  }
  const toType = getSchemaURI(toSchema);
  if (!toType) {
    throw new Error(`Migration.fromLens: "${lens.id}" has an invalid target schema.`);
  }

  const allowDropped = new Set(options.allowDropped ?? []);
  const coverage = Lens.coverage(lens);
  const unexpectedDropped = [...coverage.dropped].filter((property) => !allowDropped.has(property)).sort();
  if (unexpectedDropped.length > 0) {
    throw new Error(
      `Migration.fromLens: "${lens.id}" drops source ${unexpectedDropped.length === 1 ? 'property' : 'properties'} ` +
        `[${unexpectedDropped.join(', ')}] with no counterpart on the target. Pass allowDropped to accept the loss.`,
    );
  }
  if (coverage.suspicious.length > 0) {
    const detail = [...coverage.suspicious]
      .map(({ property, candidates }) => `${property} (candidates: [${candidates.join(', ')}])`)
      .join('; ');
    throw new Error(`Migration.fromLens: "${lens.id}" has unresolved suspicious mappings: ${detail}.`);
  }

  return {
    [TypeId]: TypeId,
    kind: 'object',
    fromType,
    toType,
    fromSchema,
    toSchema,
    lens,
    transform: async (from: unknown) => {
      if (!Obj.isObject(from)) {
        throw new Error(`Migration.fromLens: "${lens.id}" transform received a non-object value.`);
      }

      const lawCheck = Lens.checkLaws(from, lens);
      if (!lawCheck.holds) {
        const detail = lawCheck.violations.map((violation) => `${violation.property} (${violation.path})`).join('; ');
        throw new Error(`Migration.fromLens: "${lens.id}" fails the GetPut law for object ${from.id}: ${detail}.`);
      }

      const { id: _id, ...rest } = Lens.get(from, lens);
      return rest;
    },
    onMigration: options.onMigration,
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

const MigrationMarkerSchema = Schema.Struct({
  /** URI of the type the object was migrated from. */
  from: Schema.String,
  /** URI of the type the object was migrated to. */
  to: Schema.String,
  /**
   * The object's automerge heads immediately before the migration's change. Post-migration heads
   * are not stored: they are that change itself, locatable by its `message` (`migration: <from> -> <to>`).
   */
  preHeads: Schema.Array(Schema.String),
});

/**
 * Value of {@link MigrationMarkerAnnotation}: recorded on an object by the runner immediately after
 * it applies an object migration's single change.
 */
export type MigrationMarker = Schema.Schema.Type<typeof MigrationMarkerSchema>;

/**
 * Per-object marker left in `EntityMeta.annotations` by the migration runner, so a later pass (the
 * fold-forward runner, a doctor diagnostic) can find a migrated object and replay any source-property
 * write that landed after `preHeads`.
 */
export const MigrationMarkerAnnotation = Annotation.make<MigrationMarker>({
  id: 'org.dxos.annotation.migrationMarker',
  schema: MigrationMarkerSchema,
});
