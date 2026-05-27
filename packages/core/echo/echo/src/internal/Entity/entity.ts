//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import type * as Types from 'effect/Types';

import { type ObjectId } from '@dxos/keys';
import { type ToMutable } from '@dxos/util';

import { type TypeAnnotation, TypeAnnotationId, makeTypeJsonSchemaAnnotation } from '../Annotation';
import { defineHiddenProperty } from '../common/proxy/define-hidden-property';
import { makeObject } from '../common/proxy/make-object';
import { getProxyTarget } from '../common/proxy/proxy-utils';
import {
  type AnyEntity,
  EntityKind,
  InstancePhantomId,
  KindId,
  type ObjectMeta,
  SchemaKindId,
  StaticTypeSchemaSlot,
} from '../common/types';
import { JsonSchemaType } from '../JsonSchema';

// TODO(burdon): Define Schema type for `typename` and use consistently for all DXN-like properties.

// type RequiredKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? never : K }[keyof T];
export type EchoTypeSchemaProps<T, ExtraFields = {}> = Types.Simplify<AnyEntity & ToMutable<T> & ExtraFields>;

/**
 * In-memory `Type.Type` entity shape produced by `Type.makeObject(dxn)` /
 * `Type.makeRelation({...})`. A live reactive `TypeSchema` instance —
 * identical to a persisted `Type.Type` except for database attachment.
 *
 * NOT a `Schema.Schema`. The underlying Effect Schema is cached on the hidden
 * `StaticTypeSchemaSlot` slot — retrieve it via `Type.getSchema(...)`.
 */
// TODO(burdon): Rename EchoEntitySchema.
export interface EchoTypeSchema<
  Self extends Schema.Schema.Any,
  ExtraFields = {},
  K extends EntityKind = EntityKind,
  Fields extends Schema.Struct.Fields = Schema.Struct.Fields,
> {
  /**
   * Entity-kind brand. Type entities are their own kind (`Type`) regardless of
   * the kind of instance they describe — `[SchemaKindId]` carries the latter.
   * This lets predicates like `Obj.isObject` / `Relation.isRelation` cleanly
   * reject type entities without also having to inspect `[SchemaKindId]`.
   */
  readonly [KindId]: EntityKind.Type;

  /** Schema-kind brand indicating what kind of instance this type describes. */
  readonly [SchemaKindId]: K;

  /**
   * Entity id. Always present — stamped at construction — but NOT the type's
   * identity while in-memory: an unattached type resolves its URI to the typename
   * DXN, switching to `echo:/<id>` only once attached to a database (see
   * `getTypeURIFromSpecifier`, which discriminates by database attachment).
   */
  readonly id: ObjectId;

  /** Source Effect Schema (kept on a hidden slot for `Type.getSchema`). */
  readonly [StaticTypeSchemaSlot]: Schema.Schema.AnyNoContext;

  // NOTE: `typename` / `version` are intentionally NOT fields. They live in
  // `ObjectMeta` (`key` / `version`); read via `Type.getTypename(self)` /
  // `Type.getVersion(self)`.
  readonly jsonSchema: JsonSchemaType;

  /** Struct fields for introspection. */
  readonly fields: Fields;

  /** Phantom — instance type produced by `Obj.make(self, ...)`. */
  readonly _instance?: EchoTypeSchemaProps<Schema.Schema.Type<Self>, ExtraFields>;

  /**
   * Phantom slot mirroring `Type<A>` so internal helpers (`makeObject`,
   * `createObject`, `Ref.make`) infer the instance type uniformly whether
   * the caller passes an `EchoTypeSchema` or a top-level `Type.Type` entity.
   *
   * Includes the instance-kind brand (`[KindId]`) so the phantom is assignable
   * to the matching public-side interface in `Type.ts` (`Type.Obj` /
   * `Type.Relation` / `Type.Type`). Each kind projects identity: instances of
   * an object-kind schema are object-kind entities, type-kind schemas produce
   * type-kind (persisted Type.Type) entities — the latter additionally carry
   * the `[SchemaKindId]` / `[StaticTypeSchemaSlot]` brands the echo-handler
   * proxy exposes on persisted Type entities.
   */
  readonly [InstancePhantomId]?: EchoTypeSchemaProps<Schema.Schema.Type<Self>, ExtraFields> & {
    readonly [KindId]: K;
  } & (K extends EntityKind.Type
      ? {
          readonly [SchemaKindId]: EntityKind.Type;
          readonly [StaticTypeSchemaSlot]: Schema.Schema.AnyNoContext;
        }
      : {});
}

// type MakeProps =
//   | boolean
//   | {
//       readonly disableValidation?: boolean;
//     };

// NOTE: Utils copied from Effect `Schema.ts`.
// const _ownKeys = (o: object): Array<PropertyKey> =>
//   (Object.keys(o) as Array<PropertyKey>).concat(Object.getOwnPropertySymbols(o));

// const _lazilyMergeDefaults = (
//   fields: Schema.Struct.Fields,
//   out: Record<PropertyKey, unknown>,
// ): { [x: string | symbol]: unknown } => {
//   const ownKeys = _ownKeys(fields);
//   for (const key of ownKeys) {
//     const field = fields[key];
//     if (out[key] === undefined && Schema.isPropertySignature(field)) {
//       const ast = field.ast;
//       const defaultValue = ast._tag === 'PropertySignatureDeclaration' ? ast.defaultValue : ast.to.defaultValue;
//       if (defaultValue !== undefined) {
//         out[key] = defaultValue();
//       }
//     }
//   }
//   return out;
// };

// const _getDisableValidationMakeOption = (options: MakeProps | undefined): boolean =>
//   Predicate.isBoolean(options) ? options : options?.disableValidation ?? false;

/**
 * Effect Schema that every `Type.Type` entity is an instance of: the meta-schema
 * struct `{ name?, jsonSchema, id }` branded as a type-kind ECHO entity. Built
 * once and memoised. This is the materialisation vehicle for `makeObject` below
 * — the canonical user-facing entity is `Type/type-schema.ts`'s
 * `TypeSchema`, which carries the same shape plus UI annotations.
 *
 * Kept self-contained (no import of `TypeSchema`) to avoid a bootstrap cycle:
 * `TypeSchema` is itself produced via `makeEchoTypeSchema`, so this builder
 * must not depend on it.
 */
let _persistentEntitySchema: Schema.Schema.AnyNoContext | undefined;
const getPersistentEntitySchema = (): Schema.Schema.AnyNoContext => {
  if (_persistentEntitySchema) {
    return _persistentEntitySchema;
  }
  const typename = 'org.dxos.type.schema';
  const version = '0.1.0';
  // `jsonSchema` is declared optional here (only on the materialisation vehicle —
  // the canonical `TypeSchema` keeps it required) so the construction-time
  // `Schema.asserts` does not force the field before it is attached. It is
  // populated immediately after via a lazy accessor (see `makeEchoTypeSchema`),
  // which defers self-referential `Schema.suspend(...)` resolution until first
  // read — by then the recursive type const is no longer in its TDZ.
  const struct = Schema.Struct({
    name: Schema.optional(Schema.String),
    jsonSchema: JsonSchemaType.pipe(Schema.optional),
    id: Schema.String,
  });
  const ast = SchemaAST.annotations(struct.ast, {
    [TypeAnnotationId]: { kind: EntityKind.Type, typename, version } satisfies TypeAnnotation,
    [SchemaAST.JSONSchemaAnnotationId]: makeTypeJsonSchemaAnnotation({ kind: EntityKind.Type, typename, version }),
  });
  return (_persistentEntitySchema = Schema.make(ast));
};

/**
 * @internal
 *
 * Build an in-memory `Type.Type` entity (the value returned by `Type.makeObject`
 * / `Type.makeRelation`). The result is a LIVE reactive `TypeSchema`
 * instance — identical in every respect to a persisted `Type.Type` except that
 * it is not yet attached to a database. It is mutable via `Type.update`, can be
 * passed to `db.add(...)` (which keeps the same proxy and swaps the handler),
 * and round-trips through `jsonSchema`.
 *
 * The source Effect Schema describing the user's type is cached on
 * `[StaticTypeSchemaSlot]` so `Type.getSchema(...)` returns it without a
 * jsonSchema round-trip; the cache is invalidated by the proxy set-trap when
 * `jsonSchema` is mutated (see `typed-handler.ts`).
 */
export const makeEchoTypeSchema = <
  Self extends Schema.Schema.Any,
  K extends EntityKind = EntityKind,
  // TODO(wittjosiah): Can this be inferred from the schema?
  Fields extends Schema.Struct.Fields = Schema.Struct.Fields,
>(
  fields: Fields,
  ast: SchemaAST.AST,
  typename: string,
  version: string,
  kind: K,
  computeJsonSchema: () => JsonSchemaType,
): EchoTypeSchema<Self, {}, K, Fields> => {
  // Source Effect Schema describing the user's type — cached for `Type.getSchema`.
  const sourceSchema = Schema.make<
    EchoTypeSchemaProps<Schema.Schema.Type<Self>>,
    EchoTypeSchemaProps<Schema.Schema.Encoded<Self>>,
    Schema.Schema.Context<Self>
  >(ast);

  // `typename` / `version` route through `ObjectMeta` (`key` / `version`) — the
  // canonical registry-provenance pair — not data fields. `keys` is empty for
  // in-memory declarations until persisted.
  const meta: ObjectMeta = { keys: [], key: typename, version };

  // Materialise as a live reactive meta-schema instance. `jsonSchema` is attached
  // lazily below (not passed here) so its computation — which may resolve
  // self-referential `Schema.suspend(...)` branches — is deferred past module init.
  const entity = makeObject(getPersistentEntitySchema() as Schema.Schema<any, any, never>, {} as any, meta);

  const target = getProxyTarget(entity)!;
  // Lazy, memoised `jsonSchema` accessor. Kept as a permanent accessor (never
  // converted to a plain data property) so reads flow through the get-trap's
  // getter branch, which returns the raw value rather than wrapping it in a
  // child reactive proxy. The jsonSchema object is attached post-construction
  // (bypassing the set-trap that stamps `SchemaId` on nested values), so
  // wrapping it would fail the `SchemaId`-in-target invariant. Mutations still
  // route through the proxy set-trap (which invalidates the cached source
  // schema on `Type.update` / `Type.addFields` and fires reactivity); the
  // setter here just records the new value. Computation is deferred to first
  // read so self-referential `Schema.suspend(...)` branches resolve past
  // module init rather than during construction.
  let memoizedJsonSchema: JsonSchemaType | undefined;
  Object.defineProperty(target, 'jsonSchema', {
    configurable: true,
    enumerable: true,
    get() {
      return (memoizedJsonSchema ??= computeJsonSchema());
    },
    set(value: JsonSchemaType) {
      memoizedJsonSchema = value;
    },
  });
  // Cache the source Effect Schema (read by `Type.getSchema` via the proxy's
  // `[StaticTypeSchemaSlot]` get-trap; invalidated on `jsonSchema` mutation).
  defineHiddenProperty(target, StaticTypeSchemaSlot, sourceSchema);
  // Schema-kind brand: what kind of instance this type describes. There is no
  // database handler to derive it for in-memory entities, so stamp it directly.
  defineHiddenProperty(target, SchemaKindId, kind);
  // Struct fields for introspection. Exposed as a getter (not a plain data
  // property) so the proxy get-trap returns the raw fields object instead of
  // wrapping it in a child reactive proxy (which would fail the SchemaId
  // invariant — the fields object is not an ECHO entity).
  Object.defineProperty(target, 'fields', { configurable: true, enumerable: false, get: () => fields });

  return entity as unknown as EchoTypeSchema<Self, {}, K, Fields>;
};
