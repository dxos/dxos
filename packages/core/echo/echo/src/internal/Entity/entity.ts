//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import type * as SchemaAST from 'effect/SchemaAST';
import type * as Types from 'effect/Types';

import { ObjectId } from '@dxos/keys';
import { type ToMutable } from '@dxos/util';

import {
  type AnyEntity,
  type EntityKind,
  InstancePhantomId,
  KindId,
  MetaId,
  type ObjectMeta,
  SchemaKindId,
  StaticTypeMarkerId,
  StaticTypeSchemaSlot,
} from '../common/types';
import { type JsonSchemaType } from '../JsonSchema';

// TODO(burdon): Define Schema type for `typename` and use consistently for all DXN-like properties.

// type RequiredKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? never : K }[keyof T];
export type EchoTypeSchemaProps<T, ExtraFields = {}> = Types.Simplify<AnyEntity & ToMutable<T> & ExtraFields>;

/**
 * Static (in-memory) `Type.Type` entity shape produced by
 * `Type.makeObject(dxn)` / `Type.makeRelation({...})`.
 *
 * NOT a `Schema.Schema`. The underlying Effect Schema lives in the hidden
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
   * Entity id. Always present — stamped at construction even for static
   * declarations — but NOT the type's identity: a static type resolves its URI
   * to the typename DXN, not `echo:/<id>` (see `getTypeURIFromSpecifier`).
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
 * @internal
 *
 * Build a static `Type.Type` entity (the value returned by `Type.makeObject`
 * / `Type.makeRelation`). The Effect Schema describing the type is stashed
 * on `[StaticTypeSchemaSlot]` so `Type.getSchema(...)` can retrieve it
 * directly. The entity is ALSO a Schema instance at runtime as a
 * transitional back-compat affordance until the codebase is migrated off
 * `Foo.ast` / `Schema.is(Foo)` / `Schema.extend(Foo)` / `Schema.Schema.Type<typeof Foo>`.
 *
 * The TS type returned (`EchoTypeSchema`) does NOT expose Schema methods —
 * the runtime affordance is purely for legacy call sites until they migrate.
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
  /**
   * Thunk that computes the entity's `jsonSchema`. Deferred so that schemas
   * with `Schema.suspend(...)` recursion (self-referential `Ref.Ref(Self)`)
   * don't force evaluation of the suspended branches at construction time.
   */
  computeJsonSchema: () => JsonSchemaType,
): EchoTypeSchema<Self, {}, K, Fields> => {
  const schema = Schema.make<
    EchoTypeSchemaProps<Schema.Schema.Type<Self>>,
    EchoTypeSchemaProps<Schema.Schema.Encoded<Self>>,
    Schema.Schema.Context<Self>
  >(ast);
  let memoizedJsonSchema: JsonSchemaType | undefined;
  // Attach a frozen `ObjectMeta` eagerly so `Type.getMeta` reads it through the
  // uniform `[MetaId]` path (no synthetic fallback). `key` / `version` are the
  // canonical registry-provenance pair; `keys` is empty for static declarations.
  const meta: ObjectMeta = Object.freeze({
    keys: Object.freeze([]) as never,
    key: typename,
    version,
  });
  const entity = {
    [KindId]: 'type' as EntityKind.Type,
    [SchemaKindId]: kind,
    [StaticTypeSchemaSlot]: schema as unknown as Schema.Schema.AnyNoContext,
    // Marks this as a static (in-memory) type entity so URI resolution maps it
    // to the typename DXN rather than `echo:/<id>` (see `getTypeURIFromSpecifier`).
    [StaticTypeMarkerId]: true,
    [MetaId]: meta,
    // Like every ECHO entity, a static type entity carries an `id`. It is NOT
    // its identity — static types resolve their URI to the typename DXN (see
    // `getTypeURIFromSpecifier`, which discriminates static vs persisted by
    // `isInstanceOf(PersistentType, ...)`, not by id presence). The id only
    // becomes the URI once the type is persisted into a database.
    id: ObjectId.random(),
    // NOTE: typename/version are intentionally NOT own properties. They live in
    // `[MetaId]` (ObjectMeta.key/version) and are read via `Type.getTypename` /
    // `Type.getVersion`, matching persisted `Type.Type` entities.
    fields,
  };
  Object.defineProperty(entity, 'jsonSchema', {
    configurable: true,
    enumerable: true,
    get() {
      return (memoizedJsonSchema ??= computeJsonSchema());
    },
  });
  return Object.freeze(entity) as unknown as EchoTypeSchema<Self, {}, K, Fields>;
};
