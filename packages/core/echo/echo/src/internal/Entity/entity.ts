//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import type * as Types from 'effect/Types';

import { DXN, EntityId } from '@dxos/keys';
import { type ToMutable } from '@dxos/util';

import { type TypeAnnotation, TypeAnnotationId } from '../Annotation/annotations';
import { makeTypeJsonSchemaAnnotation } from '../Annotation/util';
import { defineHiddenProperty } from '../common/proxy/define-hidden-property';
import { makeObject } from '../common/proxy/make-object';
import { getProxyTarget } from '../common/proxy/proxy-utils';
import {
  type AnyEntity,
  EntityKind,
  InstancePhantomId,
  KindId,
  type EntityMeta,
  SchemaKindId,
  StaticTypeSchemaSlot,
} from '../common/types';
import { JsonSchemaType } from '../JsonSchema/json-schema-type';
import type * as Entity from '../../Entity';

// TODO(burdon): Define Schema type for `typename` and use consistently for all DXN-like properties.

// type RequiredKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? never : K }[keyof T];
export type EchoTypeSchemaProps<T, ExtraFields = {}> = Types.Simplify<AnyEntity & ToMutable<T> & ExtraFields>;

/**
 * Options accepted by every `Type.makeObject` / `Type.makeRelation` / type-kind
 * factory. Defaults are derived from `(typename, version)` so callers normally
 * pass nothing.
 */
export type EchoTypeOptions = {
  /**
   * Override the entity id stamped on the in-memory `Type.Type` value.
   *
   * Defaults to `EntityId.deterministic(typename, version)` — stable across processes
   * and workerd-safe (no `crypto.getRandomValues()` at module-evaluation time).
   * Pass an explicit id (typically `EntityId.random()`) to opt out of the
   * deterministic default.
   */
  id?: EntityId;
};

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
  readonly id: EntityId;

  /** Source Effect Schema (kept on a hidden slot for `Type.getSchema`). */
  readonly [StaticTypeSchemaSlot]: Schema.Schema.AnyNoContext;

  // NOTE: `typename` / `version` are intentionally NOT fields. They live in
  // `EntityMeta` (`key` / `version`); read via `Type.getTypename(self)` /
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
 * Identity (typename + version) of the type meta-schema — the `Type.Type` that
 * every ECHO type entity is itself an instance of. Shared by the materialisation
 * vehicle ({@link persistentEntitySchema}) and `TypeSchema` so the two cannot
 * drift on identity.
 */
export const TypeMetaSchemaDXN = DXN.make('org.dxos.type.schema', '0.1.0');

/**
 * Effect Schema that every `Type.Type` entity is an instance of: the meta-schema
 * struct `{ name?, jsonSchema, id }` branded as a type-kind ECHO entity. This is
 * the materialisation vehicle for `makeObject` below — the canonical user-facing
 * entity is `Type/type-schema.ts`'s `TypeSchema`, which carries the same shape
 * plus UI annotations.
 *
 * Kept self-contained (no import of `TypeSchema`) to avoid a bootstrap cycle:
 * `TypeSchema` is itself produced via `makeEchoTypeSchema`, so this builder must
 * not depend on it. `jsonSchema` is declared optional here (only on the
 * materialisation vehicle — the canonical `TypeSchema` keeps it required) so the
 * construction-time `Schema.asserts` does not force the field before it is
 * attached; it is populated immediately after via a lazy accessor (see
 * `makeEchoTypeSchema`).
 */
// TODO(wittjosiah): Reconcile with `TypeSchema` (`Type/type-schema.ts`).
//   Both describe the same `org.dxos.type.schema` shape.
const persistentEntitySchema: Schema.Schema.AnyNoContext = (() => {
  const typename = DXN.getName(TypeMetaSchemaDXN);
  const version = DXN.getVersion(TypeMetaSchemaDXN)!;
  const struct = Schema.Struct({
    name: Schema.optional(Schema.String),
    jsonSchema: JsonSchemaType.pipe(Schema.optional),
    id: EntityId,
  });
  const ast = SchemaAST.annotations(struct.ast, {
    [TypeAnnotationId]: { kind: EntityKind.Type, typename, version } satisfies TypeAnnotation,
    [SchemaAST.JSONSchemaAnnotationId]: makeTypeJsonSchemaAnnotation({ kind: EntityKind.Type, typename, version }),
  });
  return Schema.make(ast);
})();

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
  explicitId?: EntityId,
): EchoTypeSchema<Self, {}, K, Fields> => {
  // Source Effect Schema describing the user's type — cached for `Type.getSchema`.
  const sourceSchema = Schema.make<
    EchoTypeSchemaProps<Schema.Schema.Type<Self>>,
    EchoTypeSchemaProps<Schema.Schema.Encoded<Self>>,
    Schema.Schema.Context<Self>
  >(ast);

  // `typename` / `version` route through `EntityMeta` (`key` / `version`) — the
  // canonical registry-provenance pair — not data fields. `keys` is empty for
  // in-memory declarations until persisted.
  const meta: EntityMeta = { keys: [], key: typename, version };

  // Default to a deterministic id derived from `(typename, version)` so that
  // constructing a `Type.Type` entity never reaches `crypto.getRandomValues()`.
  // Cloudflare workerd forbids RNG calls in global scope, and the ~hundreds of
  // `Type.makeObject(...)` call sites across the monorepo execute at module top.
  // `setIdOnTarget` (see `proxy/make-object.ts`) short-circuits on a pre-supplied
  // valid id, so this also bypasses the `EntityId.random()` path inside `makeObject`.
  // Callers can override via `Type.makeObject(dxn, { id })` when they want a fresh
  // random id (e.g. inside a request handler where workerd does allow RNG).
  const id = explicitId ?? EntityId.deterministic(typename, version);

  // Materialise as a live reactive meta-schema instance. `jsonSchema` is attached
  // below as a getter (not passed here as data) for two reasons; see that accessor.
  const entity = makeObject(persistentEntitySchema, { id } as any, meta);

  const target = getProxyTarget(entity)!;
  // `jsonSchema` is always available, but computed once on first read rather than at
  // construction: serializing the AST walks `Schema.suspend(...)` thunks, and for a
  // self-referential type (`Schema.suspend(() => Self)`) that thunk hits `Self`'s TDZ
  // while we're still inside its `const` initializer. A getter also lets reads return
  // the raw object instead of a child reactive proxy.
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
  // Struct fields for introspection. A getter (not a data property) so reads return
  // the raw fields object rather than a child reactive proxy.
  Object.defineProperty(target, 'fields', { configurable: true, enumerable: false, get: () => fields });

  return entity as unknown as EchoTypeSchema<Self, {}, K, Fields>;
};

export { isEntity } from './guard';