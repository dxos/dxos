//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { SchemaEx } from '@dxos/effect';
import { DXN, type URI } from '@dxos/keys';

import * as Annotation from './Annotation.ts';
import type * as Database from './Database.ts';
import type * as Entity from './Entity.ts';
import * as Filter from './Filter.ts';
import { type EntityMeta, MetaId, getSchemaURI } from './internal/index.ts';
import * as Lens from './Lens.ts';
import * as Obj from './Obj.ts';
import type * as Ref from './Ref.ts';
import * as Type from './Type.ts';

export const TypeId = '~@dxos/echo/Migration' as const;
export type TypeId = typeof TypeId;

/**
 * Base of every migration definition.
 */
export interface Migration {
  readonly [TypeId]: TypeId;
  readonly kind: 'object' | 'rename' | 'fanIn' | 'arrayFanOut' | 'stampElementIds';
}

const KINDS = new Set<string>(['object', 'rename', 'fanIn', 'arrayFanOut', 'stampElementIds']);

/**
 * Type guard for values produced by {@link define} / {@link defineRename} / {@link defineFanIn} /
 * {@link defineArrayFanOut} / {@link defineStampElementIds}.
 */
export const isMigration = (value: unknown): value is Migration => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as { [TypeId]?: unknown; kind?: unknown };
  // `kind` is checked too: a branded value carrying an unknown kind is not a migration any
  // consumer can dispatch on.
  return candidate[TypeId] === TypeId && typeof candidate.kind === 'string' && KINDS.has(candidate.kind);
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
   *       Must not call `db.runMigrations` or `db.foldForward`: the running pass holds their lock.
   */
  onMigration?: (params: OnMigrateProps<From, To>) => Promise<void>;
};

/**
 * Data a `transform` passes to {@link ObjectMigrationContext.ensure} to create a fan-out child: the
 * target type's own properties, with `id` and identity supplied by the runner (a random id) and by
 * the caller-supplied convergence key (never a caller-chosen id — see the "derived object ids" item
 * ruled out in M0-REPORT.md's evidence map).
 */
export type EnsureData<To extends Type.AnyObj> = Entity.Properties<Type.InstanceType<To>>;

/**
 * Context passed to object migration callbacks.
 */
export type ObjectMigrationContext = {
  db: Database.Database;

  /**
   * Finds the object of `type` whose `meta.convergenceKey` equals `convergenceKey` — a durable query
   * (there is no `Filter` for a convergence key, so every candidate of `type` is read and matched),
   * never the local working set alone: a working-set-only check cannot see a child an EARLIER, separate
   * `runMigrations`/`foldForward` call created once this session's in-memory query cache has moved on
   * (confirmed empirically — the gap this async signature closes), nor one created before a crash or
   * reload. Creates one with a random id and that key when none is found. Idempotent by construction: a
   * re-run of the same `transform` finds the object it (or a duplicate independently minted by another
   * peer, once collapsed by the merge engine's creation-heads replay) already created. Callers must
   * namespace `convergenceKey` by the migration, e.g. `` `${migrationId}:${sourceId}:${role}` ``, so two
   * unrelated fan-outs never collide.
   */
  ensure<To extends Type.AnyObj>(
    type: To,
    convergenceKey: string,
    data: EnsureData<To>,
  ): Promise<Ref.Ref<Type.InstanceType<To>>>;

  /**
   * Applies a value-compare-guarded patch to `target` — another object, not the one the enclosing
   * `transform` is migrating — in one automerge change on `target`'s own core. The cross-object write
   * primitive an N→N move or a fan-in absorption uses; a patch value equal to `target`'s current value
   * writes nothing (M0-REPORT.md design item 1's guard, applied across objects).
   */
  assign<T extends Obj.Unknown>(target: T, patch: Partial<Entity.Properties<T>>): void;
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
 * The runner applies each object's transform output as minimal writes in one change, keeps source
 * properties the output omits (recorded as retired in {@link MigrationMarkerAnnotation}), and
 * resumes safely after a partial run. A write made in the old shape after an object migrated (e.g.
 * by a peer that was offline) is carried forward by fold-forward, which re-runs `transform` on the
 * object's current data. `onMigration` effects may run once per peer.
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

//
// Fan-in (M0-REPORT.md design item 3): N children absorbed into 1 parent. Requires all three
// ingredients the report calls independently load-bearing — there is no safe default for any of
// them — so `collision`/`removal` are optional in the options type but checked at definition time,
// giving a definition-time error rather than a silently-wrong runtime default.
//

/**
 * How a fan-in resolves a property both the parent and an absorbed child define: `'parent-wins'`
 * keeps the parent's existing value, `'child-wins'` takes the child's, and a function decides
 * per key. There is no default — the concurrent-write winner without one is actor-id-randomized
 * (M0-REPORT.md design item 3), so leaving this undeclared is a definition error.
 */
export type CollisionPolicy =
  | 'parent-wins'
  | 'child-wins'
  | ((parentValue: unknown, childValue: unknown, key: string) => unknown);

/**
 * Definition of a fan-in: absorbs every live object of `fromType` into the parent `parentOf` names,
 * via `absorb`, then tombstones the child. Constructed by {@link defineFanIn}.
 *
 * A declared `to` switches the child's type in the same change that tombstones it.
 */
export interface FanInMigration extends Migration {
  readonly kind: 'fanIn';
  from: Type.AnyObj;
  to?: Type.AnyObj;
  fromType: URI.URI;
  toType?: URI.URI;
  /** Resolves the child's parent, or `undefined` when it cannot be resolved yet (skipped this pass). */
  parentOf(child: unknown): Ref.Ref<Obj.Unknown> | undefined;
  /** Computes the patch to {@link ObjectMigrationContext.assign} onto the parent for one child. */
  absorb(parent: Obj.Unknown, child: unknown): Record<string, unknown>;
  collision: CollisionPolicy;
  removal: 'tombstone';
}

/**
 * Narrows a migration to a {@link FanInMigration}.
 */
export const isFanInMigration = (migration: Migration): migration is FanInMigration => migration.kind === 'fanIn';

/**
 * Options for {@link defineFanIn}.
 */
export type DefineFanInOptions<From extends Type.AnyObj, To extends Type.AnyObj = From> = {
  from: From;
  /** Optional type the child is switched to before being tombstoned; omit to tombstone under `from`. */
  to?: To;
  parentOf: (child: MigrationInstanceType<From>) => Ref.Ref<Obj.Unknown> | undefined;
  absorb: (parent: Obj.Unknown, child: MigrationInstanceType<From>) => Record<string, unknown>;
  collision?: CollisionPolicy;
  removal?: 'tombstone';
};

/**
 * Define a fan-in: every live object of `from` is absorbed into the parent `parentOf` resolves it to
 * (via `absorb`, a value-compare-guarded cross-object write with `collision` deciding a genuine
 * property clash), then tombstoned (`removal: 'tombstone'`) — never erased, so a late write to an
 * already-absorbed child still folds in (its history stays readable). Re-running is a no-op for an
 * already-absorbed child (already tombstoned, `assign`'s guards see no change) and absorbs any child
 * created after an earlier run "completed" (queried by type on every run, never tracked).
 *
 * @example
 * ```ts
 * const migration = Migration.defineFanIn({
 *   from: AddressV1,
 *   parentOf: (address) => address.owner,
 *   absorb: (parent, address) => ({ employerName: address.street }),
 *   collision: 'parent-wins',
 *   removal: 'tombstone',
 * });
 * ```
 */
export const defineFanIn = <From extends Type.AnyObj, To extends Type.AnyObj = From>(
  options: DefineFanInOptions<From, To>,
): FanInMigration => {
  if (options.collision === undefined) {
    throw new Error(
      'Migration.defineFanIn: "collision" must be declared — a property both a parent and an absorbed child ' +
        'define has no safe default resolution (M0-REPORT.md design item 3).',
    );
  }
  if (options.removal === undefined) {
    throw new Error(
      'Migration.defineFanIn: "removal" must be declared — fan-in never silently decides how an absorbed ' +
        'child is disposed of.',
    );
  }

  const fromType = getSchemaURI(Type.getSchema(options.from));
  if (!fromType) {
    throw new Error('Migration.defineFanIn: invalid "from" schema.');
  }

  let toType: URI.URI | undefined;
  if (options.to) {
    toType = getSchemaURI(Type.getSchema(options.to));
    if (!toType) {
      throw new Error('Migration.defineFanIn: invalid "to" schema.');
    }
  }

  return {
    [TypeId]: TypeId,
    kind: 'fanIn',
    from: options.from,
    to: options.to,
    fromType,
    toType,
    parentOf: options.parentOf,
    absorb: options.absorb,
    collision: options.collision,
    removal: options.removal,
  };
};

/**
 * Value of {@link FanInMarkerAnnotation}: recorded on the CHILD by {@link runFanInMigration} (in
 * `@dxos/echo-client`) in the same change as its type switch and tombstone. `migration` doubles as
 * that change's own `message`, so a fold-forward pass locates it by message + `deps` the same way
 * {@link MigrationMarkerAnnotation}'s steps locate their own migration change; `preHeads` is the
 * child's frontier immediately before that change, and `absorbedAtParentHeads` is the PARENT's
 * frontier immediately after the `assign` that absorbed this child landed — the base a late fold
 * writes into the parent concurrently with, so a direct edit made after absorption still conflicts
 * with the fold instead of being silently overwritten.
 */
export const FanInMarkerSchema = Schema.Struct({
  /** `` `fan-in: <fromType> -> <parentId>` `` — also the absorb change's own `message`. */
  migration: Schema.String,
  /** Id of the parent object this child was absorbed into. */
  parentId: Schema.String,
  /** The child's own automerge heads immediately before its absorb change. */
  preHeads: Schema.Array(Schema.String),
  /** The parent's automerge heads immediately after the absorb `assign` landed. */
  absorbedAtParentHeads: Schema.Array(Schema.String),
  /**
   * Absorbed keys whose value at absorb time came FROM THE CHILD: the parent had no value for the key
   * yet, or the declared `collision` policy picked the child's value over a genuinely competing parent
   * value. A key the parent's OWN pre-existing value won is never listed here. This is what lets a
   * fold-forward pass tell "the child updating its own contribution" (fold it in directly) from "the
   * child's value newly colliding with the parent's" (still subject to `collision`) — collapsing the
   * two would freeze a `parent-wins` fan-in's very first absorption forever, since every later child
   * edit would then compare against a parent value that only exists because THIS child put it there.
   */
  fromChild: Schema.Array(Schema.String),
  /**
   * Child heads through which a fold-forward pass has already re-absorbed late writes. Absent until
   * the first late write folds; advanced in place (never a whole-annotation replace) so a concurrent
   * write to a sibling field of this same marker is never disturbed.
   */
  foldedAt: Schema.optional(Schema.Array(Schema.String)),
});

/**
 * A tombstoned fan-in child's absorption record — see {@link FanInMarkerSchema}.
 */
export type FanInMarker = Schema.Schema.Type<typeof FanInMarkerSchema>;

/**
 * Per-child marker left in `EntityMeta.annotations` by the fan-in runner, so a fold-forward pass can
 * find an already-absorbed (tombstoned) child and replay any write that landed on it after absorption
 * — the child's history stays readable and never silently ignored (M0-REPORT.md design item 3, "late
 * writes to tombstoned children fold forward; tombstones never erase").
 */
export const FanInMarkerAnnotation = Annotation.make<FanInMarker>({
  id: 'org.dxos.annotation.fanInMarker',
  schema: FanInMarkerSchema,
});

//
// Array fan-out (M0-REPORT.md design item 5): fanning an array property out into one child per
// element requires each element to carry a pre-existing stable id — declaring it over an id-less
// element schema is a definition error, ratified by the report as the precondition that makes the
// rest of the composition (two ordinary migrations) correct.
//

/** The stable-id precondition, shared by {@link defineArrayFanOut} and {@link defineStampElementIds}. */
const assertElementIdField = (
  schema: Schema.Codec<any, any>,
  property: string,
  elementId: string,
  caller: string,
): void => {
  const arrayProperty = SchemaEx.getProperties(schema.ast).find((candidate) => String(candidate.name) === property);
  if (!arrayProperty) {
    throw new Error(`Migration.${caller}: "${property}" is not a declared property.`);
  }
  const elementType = SchemaEx.getArrayElementType(arrayProperty.type);
  if (!elementType) {
    throw new Error(`Migration.${caller}: "${property}" is not an array property.`);
  }
  const hasElementId = SchemaEx.getProperties(elementType).some((candidate) => String(candidate.name) === elementId);
  if (!hasElementId) {
    throw new Error(
      `Migration.${caller}: the element schema of "${property}" has no "${elementId}" field — array fan-out ` +
        'requires each element to carry a pre-existing stable id (M0-REPORT.md design item 5).',
    );
  }
};

/**
 * Definition of an array fan-out: constructed by {@link defineArrayFanOut}.
 *
 * Design choice (documented per the task, since the report leaves it open): the source array
 * (`property`) is never touched by the runner — kept in place as a retired property, exactly like an
 * ordinary {@link define} migration's dropped keys — and the fanned-out children are referenced from
 * a NEW property (`toProperty`, `` `${property}Refs` `` by default) on `to`. Replacing the array
 * in place was rejected: it writes the same document key the source array occupies, which would
 * destroy the original element data in the very automerge op that is supposed to preserve it.
 */
export interface ArrayFanOutMigration extends Migration {
  readonly kind: 'arrayFanOut';
  from: Type.AnyObj;
  to: Type.AnyObj;
  child: Type.AnyObj;
  fromType: URI.URI;
  toType: URI.URI;
  childType: URI.URI;
  property: string;
  toProperty: string;
  elementId: string;
  toChild(element: Record<string, unknown>): Record<string, unknown>;
  /** Disambiguates the convergence key when a parent fans out more than one array into `childType`. */
  childRole?: string;
}

/**
 * Narrows a migration to an {@link ArrayFanOutMigration}.
 */
export const isArrayFanOutMigration = (migration: Migration): migration is ArrayFanOutMigration =>
  migration.kind === 'arrayFanOut';

/**
 * Options for {@link defineArrayFanOut}.
 */
export type DefineArrayFanOutOptions<From extends Type.AnyObj, To extends Type.AnyObj, Child extends Type.AnyObj> = {
  from: From;
  to: To;
  /** Name of the array property on `from` to fan out. */
  property: string;
  /** Name of the stable per-element id field on the array's element schema. */
  elementId: string;
  child: Child;
  toChild: (element: Record<string, unknown>) => EnsureData<Child>;
  childRole?: string;
  /** Target property on `to` receiving the array of refs. Defaults to `` `${property}Refs` ``. */
  toProperty?: string;
};

/**
 * Define an array fan-out: one child (via {@link ObjectMigrationContext.ensure}, keyed by the
 * element's stable id) per element of `from`'s `property`. An element is skipped this pass — logged,
 * never erred — when it has no id yet or its id register carries an unresolved concurrent conflict
 * (`A.getConflicts`); an object with any skipped element is left entirely alone (still `from`) so the
 * eventual full migration is one minimal, all-or-nothing write, not a half-applied one. Re-running is
 * the crash-recovery and fold-forward mechanism: `ensure` is idempotent, so a re-run only ever
 * completes what an earlier pass could not.
 *
 * @example
 * ```ts
 * const migration = Migration.defineArrayFanOut({
 *   from: ParentV1,
 *   to: ParentV2,
 *   property: 'items',
 *   elementId: 'id',
 *   child: ItemDoc,
 *   toChild: (element) => ({ name: element.name }),
 * });
 * ```
 */
export const defineArrayFanOut = <From extends Type.AnyObj, To extends Type.AnyObj, Child extends Type.AnyObj>(
  options: DefineArrayFanOutOptions<From, To, Child>,
): ArrayFanOutMigration => {
  const fromSchema = Type.getSchema(options.from);
  const fromType = getSchemaURI(fromSchema);
  if (!fromType) {
    throw new Error('Migration.defineArrayFanOut: invalid "from" schema.');
  }
  assertElementIdField(fromSchema, options.property, options.elementId, 'defineArrayFanOut');

  const toType = getSchemaURI(Type.getSchema(options.to));
  if (!toType) {
    throw new Error('Migration.defineArrayFanOut: invalid "to" schema.');
  }

  const childType = getSchemaURI(Type.getSchema(options.child));
  if (!childType) {
    throw new Error('Migration.defineArrayFanOut: invalid "child" schema.');
  }

  return {
    [TypeId]: TypeId,
    kind: 'arrayFanOut',
    from: options.from,
    to: options.to,
    child: options.child,
    fromType,
    toType,
    property: options.property,
    toProperty: options.toProperty ?? `${options.property}Refs`,
    elementId: options.elementId,
    childType,
    // `EnsureData<Child>` is `Entity.Properties<Type.InstanceType<Child>>`, which the erased
    // `Record<string, unknown>` on the interface widens to for the same reason `ObjectMigration`
    // widens `transform` — the runner dispatches on the interface, never on `Child` itself.
    toChild: options.toChild,
    childRole: options.childRole,
  };
};

/**
 * One property's array-fan-out record, recorded on the PARENT by the array-fan-out runner
 * (`runArrayFanOutMigration` in `@dxos/echo-client`) in the SAME change as that property's `toProperty`
 * refs and the type switch, mirroring {@link FanInMarkerSchema}'s combination of state into one write.
 * `migration` doubles as that change's own `message`, so a fold-forward pass locates it by message +
 * `deps`, the same way {@link MigrationMarkerAnnotation}'s steps and {@link FanInMarkerSchema} locate
 * their own change; `preHeads` is the parent's frontier immediately before that change.
 */
export const ArrayFanOutMarkerSchema = Schema.Struct({
  /** `` `array-fan-out: <fromType> -> <toType>` `` — also the split change's own `message`. */
  migration: Schema.String,
  /** The parent's own automerge heads immediately before the split change. */
  preHeads: Schema.Array(Schema.String),
  /** Name of the source array property this marker covers. */
  property: Schema.String,
  /** Name of the stable per-element id field on the array's element schema. */
  elementId: Schema.String,
  /**
   * Parent heads through which a fold-forward pass has already folded late array writes. Absent
   * until the first late write folds; advanced in place (never a whole-annotation replace) so a
   * concurrent write to a sibling field of this same marker is never disturbed.
   */
  foldedAt: Schema.optional(Schema.Array(Schema.String)),
});

/**
 * A split parent's array-fan-out record for one property — see {@link ArrayFanOutMarkerSchema}.
 */
export type ArrayFanOutMarker = Schema.Schema.Type<typeof ArrayFanOutMarkerSchema>;

/** Every fanned-out property's own marker, keyed by property name. */
const ArrayFanOutMarkerMapSchema = Schema.Record(Schema.String, ArrayFanOutMarkerSchema);

/** Value of {@link ArrayFanOutMarkerAnnotation}. */
export type ArrayFanOutMarkerValue = Schema.Schema.Type<typeof ArrayFanOutMarkerMapSchema>;

/**
 * Per-parent marker map left in `EntityMeta.annotations` by the array-fan-out runner, so a fold-forward
 * pass can find a split parent and replay any write to a source array that landed after its split
 * (M0-REPORT.md design item 5's residual: late writes to the kept source array after the split). Keyed
 * by property name so a parent that fans out more than one array property keeps one marker per property
 * — the runner writes only ITS OWN property's key (never the whole map), so splitting a second property
 * never disturbs the first's marker.
 */
export const ArrayFanOutMarkerAnnotation = Annotation.make<ArrayFanOutMarkerValue>({
  id: 'org.dxos.annotation.arrayFanOutMarker',
  schema: ArrayFanOutMarkerMapSchema,
});

/**
 * The convergence key {@link defineArrayFanOut}'s runner mints for one element's child, and the
 * format {@link findOrphanedChildren} parses back apart. Pipe-delimited, not the report's
 * illustrative colon-joined `<migrationId>:<sourceId>:<role>` — `fromType` is a `dxn:` URI, which
 * already contains colons, so colon-splitting would be ambiguous; a pipe never appears in a URI, an
 * entity id, or a caller-chosen role.
 *
 * Exposed (not module-private) so the runner (`echo-client`'s `proxy-db/array-fan-out.ts`) mints the
 * exact same key format this module's {@link findOrphanedChildren} parses.
 */
export const makeArrayFanOutConvergenceKey = (
  fromType: string,
  parentId: string,
  role: string,
  elementId: string,
): string => `${fromType}|${parentId}|${role}|${elementId}`;

const parseArrayFanOutConvergenceKey = (
  key: string,
): { fromType: string; parentId: string; role: string; elementId: string } | undefined => {
  const parts = key.split('|');
  if (parts.length !== 4) {
    return undefined;
  }
  const [fromType, parentId, role, elementId] = parts;
  return { fromType, parentId, role, elementId };
};

/**
 * The ids every currently-live element of `parent`'s fanned-out array property presents, read via
 * the object's own convergence-key-derived role — the "current truth" {@link findOrphanedChildren}
 * compares a candidate child's remembered element id against.
 */
const currentElementIds = (parent: Obj.Unknown, property: string, elementId: string): ReadonlySet<string> => {
  const items: unknown = Obj.getValue(parent, [property]);
  const ids = new Set<string>();
  if (!Array.isArray(items)) {
    return ids;
  }
  for (const item of items) {
    if (typeof item === 'object' && item !== null) {
      const record: Record<string, unknown> = item;
      const id = record[elementId];
      if (typeof id === 'string') {
        ids.add(id);
      }
    }
  }
  return ids;
};

/**
 * The doctor diagnostic for design item 5's residual: a child {@link defineArrayFanOut} minted whose
 * remembered element id is no longer present in its parent's CURRENT array — either because the
 * parent was never found (its id is stale) or the array moved on. Reviewable, not auto-resolved:
 * nothing here erases or merges the orphan (M0-REPORT.md design item 5's "reviewable duplicates,
 * detectable without tracking").
 */
export const findOrphanedChildren = async (
  db: Database.Database,
  migration: ArrayFanOutMigration,
): Promise<Obj.Unknown[]> => {
  // `Filter.type` on a bare URI (rather than a schema class) resolves to `Filter<any>`, so the
  // result is annotated explicitly here rather than left to infer `any`.
  const children: Obj.Unknown[] = await db.query(Filter.type(migration.childType)).run();
  const parents = new Map<string, Obj.Unknown | undefined>();
  const orphans: Obj.Unknown[] = [];

  for (const child of children) {
    const convergenceKey = Obj.getMeta(child).convergenceKey;
    if (!convergenceKey) {
      continue;
    }
    const parsed = parseArrayFanOutConvergenceKey(convergenceKey);
    if (!parsed || parsed.fromType !== migration.fromType.toString()) {
      continue; // Not this migration's convergence key shape — not ours to judge.
    }

    let parent = parents.get(parsed.parentId);
    if (parent === undefined && !parents.has(parsed.parentId)) {
      const matches: Obj.Unknown[] = await db.query(Filter.id(parsed.parentId)).run();
      parent = matches[0];
      parents.set(parsed.parentId, parent);
    }

    const liveIds = parent ? currentElementIds(parent, migration.property, migration.elementId) : new Set<string>();
    if (!liveIds.has(parsed.elementId)) {
      orphans.push(child);
    }
  }

  return orphans;
};

//
// Element-id stamping (M0-REPORT.md design item 5, step 1): the ordinary migration array fan-out's
// two-step composition ships first. Presence-guarded, so a re-run after reconciliation is a no-op;
// concurrent stampers' register conflicts settle by LWW, which the array-fan-out gate then checks for.
//

/**
 * Definition of an id-stamping pass: constructed by {@link defineStampElementIds}.
 */
export interface StampElementIdsMigration extends Migration {
  readonly kind: 'stampElementIds';
  entityType: Type.AnyObj;
  type: URI.URI;
  property: string;
  elementId: string;
}

/**
 * Narrows a migration to a {@link StampElementIdsMigration}.
 */
export const isStampElementIdsMigration = (migration: Migration): migration is StampElementIdsMigration =>
  migration.kind === 'stampElementIds';

/**
 * Options for {@link defineStampElementIds}.
 */
export type DefineStampElementIdsOptions<T extends Type.AnyObj> = {
  type: T;
  /** Name of the array property whose elements need a stable id. */
  property: string;
  /** Name of the id field to stamp onto each element that lacks one. */
  elementId: string;
};

/**
 * Define the id-stamping step array fan-out's stable-id precondition requires: `element[elementId] ??=
 * randomId()` for every element of `property` that lacks one. Ship this migration first and let it
 * reconcile across peers before shipping the matching {@link defineArrayFanOut} — the temporal gate
 * design item 5 relies on, not id determinism or a baseline agreement.
 *
 * @example
 * ```ts
 * const migration = Migration.defineStampElementIds({ type: ParentV1, property: 'items', elementId: 'id' });
 * ```
 */
export const defineStampElementIds = <T extends Type.AnyObj>(
  options: DefineStampElementIdsOptions<T>,
): StampElementIdsMigration => {
  const schema = Type.getSchema(options.type);
  const type = getSchemaURI(schema);
  if (!type) {
    throw new Error('Migration.defineStampElementIds: invalid "type" schema.');
  }
  assertElementIdField(schema, options.property, options.elementId, 'defineStampElementIds');

  return {
    [TypeId]: TypeId,
    kind: 'stampElementIds',
    entityType: options.type,
    type,
    property: options.property,
    elementId: options.elementId,
  };
};

export const MigrationStepSchema = Schema.Struct({
  /** URI of the type the object was migrated from. */
  from: Schema.String,
  /** URI of the type the object was migrated to. */
  to: Schema.String,
  /**
   * The object's automerge heads immediately before this step's change. Post-migration heads are not
   * stored: they are that change itself, locatable by its `message` (`migration: <from> -> <to>`).
   */
  preHeads: Schema.Array(Schema.String),
  /**
   * Source data keys this step left in place because its output omits them: kept so fold-forward
   * can read late writes to them, and never written by code on the target type.
   */
  retired: Schema.Array(Schema.String),
  /**
   * Document heads immediately after the last fold-forward pass's writes for this step. `A.diff`
   * from here (falling back to the step's own post-heads, located via `preHeads`, before the first
   * fold) names exactly the source writes no pass has folded yet — never a durable intent, so
   * a crash between the fold and this checkpoint just re-diffs a wider (harmless, value-compared)
   * range on the next pass.
   */
  foldedAt: Schema.optional(Schema.Array(Schema.String)),
  /**
   * Per-retired-property TARGET-side fork frontier for a text splice replay (a `fromLens` rename of a
   * string property), keyed by the retired source property: the heads of the change that last wrote
   * the target text, where the next replay forks from so its offsets line up. Absent until the first
   * text fold for that property.
   */
  textFrontier: Schema.optional(Schema.Record(Schema.String, Schema.Array(Schema.String))),
});

/**
 * One step of a migration marker's chain: everything the runner recorded when an object crossed one
 * `from -> to` boundary. Exported so the runner can encode a single new step without re-encoding the
 * whole marker (`#applyObjectMigration` appends a step in place).
 */
export type MigrationStep = Schema.Schema.Type<typeof MigrationStepSchema>;

/** Every step the object has been migrated through, oldest first. */
const MigrationMarkerSchema = Schema.Struct({ steps: Schema.Array(MigrationStepSchema) });

/**
 * Value of {@link MigrationMarkerAnnotation}: recorded on an object by the runner immediately after
 * it applies an object migration's single change.
 */
export type MigrationMarker = Schema.Schema.Type<typeof MigrationMarkerSchema>;

/**
 * Per-object marker left in `EntityMeta.annotations` by the migration runner, so a later pass (the
 * fold-forward runner, a doctor diagnostic) can find a migrated object and replay any source-property
 * write that landed after a step's `preHeads`.
 */
export const MigrationMarkerAnnotation = Annotation.make<MigrationMarker>({
  id: 'org.dxos.annotation.migrationMarker',
  schema: MigrationMarkerSchema,
});
