//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Option from 'effect/Option';
import type * as Schema from 'effect/Schema';

import * as SchemaAST from '@dxos/effect/SchemaAST';
import * as SchemaEx from '@dxos/effect/SchemaEx';
import { DXN, type URI } from '@dxos/keys';

import type * as Database from './Database.ts';
import type * as Entity from './Entity.ts';
import { ContentVersionAnnotation, type EntityMeta, MetaId, getSchemaURI } from './internal/index.ts';
import type * as Obj from './Obj.ts';
import * as Type from './Type.ts';

export const TypeId = '~@dxos/echo/Migration' as const;
export type TypeId = typeof TypeId;

/**
 * Base of every migration definition.
 */
export interface Migration {
  readonly [TypeId]: TypeId;
  readonly kind: 'object' | 'rename' | 'content' | 'transaction';
}

/**
 * Type guard for values produced by {@link define} / {@link defineRename} / {@link defineContent}.
 *
 * @performance O(1) brand check; no allocation.
 */
export const isMigration = (value: unknown): value is Migration => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as { [TypeId]?: unknown; kind?: unknown };
  // `kind` is checked too: a branded value carrying an unknown kind is not a migration any
  // consumer can dispatch on.
  return (
    candidate[TypeId] === TypeId &&
    (candidate.kind === 'object' ||
      candidate.kind === 'rename' ||
      candidate.kind === 'content' ||
      candidate.kind === 'transaction')
  );
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
 *
 * @performance O(1).
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
 *
 * @performance O(1) at definition time; reads both schema URIs.
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
 *
 * @performance O(1).
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
 *
 * @performance O(1) at definition time.
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

/**
 * Values of the content fields a {@link ContentVersionAnnotation} names, keyed by field name.
 * A field absent from the object is absent here.
 */
export type Content = Readonly<Record<string, unknown>>;

/**
 * Definition of one step of a content format: upgrades the fields a type's
 * {@link ContentVersionAnnotation} names from content version `from` to `to`.
 */
export interface ContentMigration extends Migration {
  readonly kind: 'content';

  /** URI of the object type whose content this step upgrades. */
  readonly type: URI.URI;

  /** The string field holding the content version. */
  readonly versionField: string;

  /** The content fields the version describes. */
  readonly fields: readonly string[];

  /** Content fields declared as records, which the runner writes key by key. */
  readonly recordFields: readonly string[];

  /** Content version this step reads. */
  readonly from: string;

  /** Content version this step writes. */
  readonly to: string;

  /** Release that first ships this step, which decides when it can be deleted. */
  readonly since: string;

  /** Pure, deterministic upgrade of the content fields. */
  readonly transform: (content: Content) => Content;
}

type DefineContentMigrationOptions<S extends MigrationSchemaInput> = {
  /** Object type whose schema carries a {@link ContentVersionAnnotation}. */
  type: S;
  from: string;
  to: string;
  since: string;
  /**
   * Returns the new values of the content fields. Must be pure and deterministic: peers migrating
   * the same object concurrently must write identical values for their changes to merge.
   */
  transform: (content: Content) => Content;
};

/**
 * Narrows a migration to a {@link ContentMigration}.
 *
 * @performance O(1).
 */
export const isContentMigration = (migration: Migration): migration is ContentMigration => migration.kind === 'content';

type ContentVersionField = { readonly field: string; readonly fields: readonly string[] };

/** The field a schema's {@link ContentVersionAnnotation} marks, with the fields it versions. */
const getContentVersionField = (ast: SchemaAST.AST): ContentVersionField | undefined => {
  for (const property of SchemaAST.getPropertySignatures(ast)) {
    if (typeof property.name !== 'string') {
      continue;
    }
    // Optionality wraps the annotated schema in a union.
    const value = Option.getOrUndefined(
      Option.orElse(ContentVersionAnnotation.getFromAst(property.type), () =>
        ContentVersionAnnotation.getFromAst(SchemaEx.unwrapOptional(property.type)),
      ),
    );
    if (value) {
      return { field: property.name, fields: value.fields };
    }
  }
  return undefined;
};

const isRecordAst = (ast: SchemaAST.AST): boolean =>
  SchemaAST.isObjects(ast) && ast.propertySignatures.length === 0 && ast.indexSignatures.length > 0;

/**
 * Define one step of a content format carried by an object type.
 *
 * The type's schema must mark its version field with {@link ContentVersionAnnotation}. Steps chain
 * by version: an object at `from` is upgraded through every step reachable from it.
 *
 * @example
 * ```ts
 * const sceneParams = Migration.defineContent({
 *   type: Drawing.Canvas,
 *   from: 'dxos.org/scene/1',
 *   to: 'dxos.org/scene/2',
 *   since: '0.11.0',
 *   transform: ({ content }) => ({ content: upgradeRecords(content) }),
 * });
 * ```
 *
 * @performance O(fields) at definition time; walks the schema's top-level properties.
 */
export const defineContent = <S extends MigrationSchemaInput>(
  options: DefineContentMigrationOptions<S>,
): ContentMigration => {
  const schema = Type.getSchema(options.type);
  const type = getSchemaURI(schema);
  if (!type) {
    throw new Error('Invalid type schema');
  }
  const version = getContentVersionField(schema.ast);
  if (!version) {
    throw new Error(`Type has no ContentVersionAnnotation: ${type}`);
  }
  if (options.from.length === 0 || options.to.length === 0 || options.from === options.to) {
    throw new Error(`Invalid content versions: ${options.from} -> ${options.to}`);
  }

  const properties = new Map(
    SchemaAST.getPropertySignatures(schema.ast).map((property) => [String(property.name), property]),
  );
  const recordFields = version.fields.filter((field) => {
    const property = properties.get(field);
    if (!property) {
      throw new Error(`ContentVersionAnnotation names an unknown field: ${field}`);
    }
    return isRecordAst(SchemaEx.unwrapOptional(property.type));
  });

  return {
    [TypeId]: TypeId,
    kind: 'content',
    type,
    versionField: version.field,
    fields: version.fields,
    recordFields,
    from: options.from,
    to: options.to,
    since: options.since,
    transform: options.transform,
  };
};

/**
 * The content steps of `type` keyed by `from`.
 *
 * @throws When two steps start at the same version, since the chain would be ambiguous.
 */
export const getContentSteps = (
  migrations: readonly Migration[],
  type: URI.URI,
): ReadonlyMap<string, ContentMigration> => {
  const steps = new Map<string, ContentMigration>();
  for (const migration of migrations) {
    if (!isContentMigration(migration) || migration.type !== type) {
      continue;
    }
    const existing = steps.get(migration.from);
    if (existing && existing !== migration) {
      throw new Error(`Ambiguous content migrations from ${migration.from}: ${existing.to}, ${migration.to}`);
    }
    steps.set(migration.from, migration);
  }
  return steps;
};

/** Result of {@link upgradeContent}. */
export type UpgradedContent = {
  readonly version: string | undefined;
  readonly content: Content;
};

/**
 * Upgrades content in memory through the chain of content steps declared for `type`, from `version`
 * to the newest version reachable. Readers use it for data that synced in before the migration pass
 * ran; the pass itself applies the same chain. Content at a version no step starts from is
 * returned as it is (same reference).
 *
 * @performance O(steps) transforms; each costs what its `transform` does.
 */
export const upgradeContent = (
  migrations: readonly Migration[],
  type: MigrationSchemaInput | URI.URI,
  version: string | undefined,
  content: Content,
): UpgradedContent => {
  const uri = typeof type === 'string' ? type : getSchemaURI(Type.getSchema(type));
  if (!uri || version === undefined) {
    return { version, content };
  }
  return applyContentSteps(getContentSteps(migrations, uri), version, content);
};

/**
 * Applies the chain of `steps` starting at `version`.
 *
 * @throws When the chain loops back to a version it already passed.
 */
export const applyContentSteps = (
  steps: ReadonlyMap<string, ContentMigration>,
  version: string,
  content: Content,
): UpgradedContent => {
  const visited = new Set<string>([version]);
  let current = version;
  let result = content;
  for (let step = steps.get(current); step; step = steps.get(current)) {
    result = step.transform(result);
    current = step.to;
    if (visited.has(current)) {
      throw new Error(`Content migrations loop at ${current}`);
    }
    visited.add(current);
  }
  return { version: current, content: result };
};

//
// Transaction
//

/**
 * Result of {@link Transaction.compact}.
 */
export type CompactResult = {
  /** Objects whose documents will be rewritten without history. */
  readonly compacted: readonly Obj.ID[];
  /** Requested objects not stored in a document of their own. */
  readonly skipped: readonly Obj.ID[];
};

/**
 * Options for {@link Transaction}.
 */
export type TransactionOptions = {
  /**
   * How {@link Transaction.commit} publishes the staged changes.
   * - `replace` (default): builds a new space root and starts a new epoch with it. Peers adopt the new
   *   root, so writes made to the old root after the transaction began are lost.
   * - `update`: writes the changed links and inline objects into the current root in one atomic change.
   *   No epoch is started, and concurrent writes to the root merge.
   */
  root?: 'replace' | 'update';
};

/**
 * Structural changes to a database, staged and then committed atomically.
 *
 * Staged changes are not visible to queries until {@link Transaction.commit}. Use it for changes that
 * an ordinary write cannot express: changing an object's type in place, removing objects without a
 * tombstone, or dropping document history. For schema changes that a write can express, prefer
 * {@link define}. Run it with `db.runMigrations` through {@link defineTransaction}, or directly:
 *
 * @example
 * ```ts
 * const migration = await space.db.beginMigration();
 * await migration.migrate(contact.id, (json) => Obj.make(ContactV2, { id: json.id, name: String(json.name) }));
 * migration.add(Obj.make(Note, { title: 'Imported' }));
 * migration.delete(legacy.id);
 * await migration.commit();
 * ```
 */
export interface Transaction {
  /**
   * The staged state of an object: what earlier calls in this transaction left, else what is stored.
   * Returns `undefined` for an object that is not stored or that this transaction deletes.
   */
  get(id: Obj.ID): Promise<Obj.JSON | undefined>;

  /**
   * Stages a new object, with every object it references that is not stored yet.
   * The object is not bound to the database: query it after {@link commit}.
   */
  add(object: Obj.Unknown): void;

  /**
   * Stages `object` in place of the stored object with the same id, replacing its type, data and meta.
   * The object's document keeps its history, so concurrent edits from peers still merge.
   *
   * @throws When no object with that id is stored.
   */
  replace(object: Obj.Unknown): void;

  /**
   * Reads the staged state of an object and stages the object `transform` returns in its place.
   * The returned object must keep the id. Does nothing for an object that is not stored.
   *
   * @returns Whether the object was found.
   */
  migrate(id: Obj.ID, transform: (current: Obj.JSON) => Obj.Unknown | Promise<Obj.Unknown>): Promise<boolean>;

  /**
   * Stages removing an object from the space. The object leaves no tombstone.
   */
  delete(id: Obj.ID): void;

  /**
   * Stages rewriting the documents of the given objects (default: every object stored in a document
   * of its own) without their history.
   */
  compact(ids?: readonly Obj.ID[]): CompactResult;

  /**
   * Writes the staged changes as {@link TransactionOptions.root} selects.
   * The transaction cannot be used afterwards.
   */
  commit(): Promise<void>;
}

/**
 * A migration that stages its changes in a {@link Transaction}, which the runner commits once `run` resolves.
 */
export interface TransactionMigration extends Migration {
  readonly kind: 'transaction';
  readonly options: TransactionOptions;
  readonly run: (transaction: Transaction) => Promise<void>;
}

/**
 * Narrows a migration to a {@link TransactionMigration}.
 *
 * @performance O(1).
 */
export const isTransactionMigration = (migration: Migration): migration is TransactionMigration =>
  migration.kind === 'transaction';

/**
 * Define a migration that stages structural changes in a {@link Transaction}.
 *
 * @example
 * ```ts
 * const migration = Migration.defineTransaction(async (transaction) => {
 *   transaction.delete(legacyId);
 * });
 * await db.runMigrations([migration]);
 * ```
 *
 * @performance O(1) at definition time.
 */
export const defineTransaction = (
  run: (transaction: Transaction) => Promise<void>,
  options: TransactionOptions = {},
): TransactionMigration => ({
  [TypeId]: TypeId,
  kind: 'transaction',
  options,
  run,
});
