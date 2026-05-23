//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import type * as SchemaAST from 'effect/SchemaAST';
import type * as Types from 'effect/Types';

import { type ToMutable } from '@dxos/util';

import { type TypeMeta } from '../Annotation';
import { type JsonSchemaType } from '../JsonSchema';
import { type AnyEntity, type EntityKind, KindId, SchemaKindId, StaticTypeSchemaSlot } from '../common/types';

// TODO(burdon): Define Schema type for `typename` and use consistently for all DXN-like properties.

// type RequiredKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? never : K }[keyof T];
export type EchoTypeSchemaProps<T, ExtraFields = {}> = Types.Simplify<AnyEntity & ToMutable<T> & ExtraFields>;

/**
 * Static (in-memory) `Type.Type` entity shape produced by
 * `Type.object(dxn)` / `Type.relation({...})` under Option B.
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
> extends TypeMeta {
  /** Entity-kind brand — always `EntityKind.Object` for type entities. */
  readonly [KindId]: EntityKind.Object;

  /** Schema-kind brand indicating object vs relation. */
  readonly [SchemaKindId]: K;

  /** Source Effect Schema (kept on a hidden slot for `Type.getSchema`). */
  readonly [StaticTypeSchemaSlot]: Schema.Schema.AnyNoContext;

  readonly typename: string;
  readonly version: string;
  readonly jsonSchema: JsonSchemaType;

  /** Struct fields for introspection. */
  readonly fields: Fields;

  /** Phantom — instance type produced by `Obj.make(self, ...)`. */
  readonly _instance?: EchoTypeSchemaProps<Schema.Schema.Type<Self>, ExtraFields>;
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
 * Build a static `Type.Type` entity (the value returned by `Type.object`
 * / `Type.relation`). The Effect Schema describing the type is stashed
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
  jsonSchema: JsonSchemaType,
): EchoTypeSchema<Self, {}, K, Fields> => {
  const schema = Schema.make<
    EchoTypeSchemaProps<Schema.Schema.Type<Self>>,
    EchoTypeSchemaProps<Schema.Schema.Encoded<Self>>,
    Schema.Schema.Context<Self>
  >(ast);
  return Object.freeze({
    [KindId]: 'object' as EntityKind.Object,
    [SchemaKindId]: kind,
    [StaticTypeSchemaSlot]: schema as unknown as Schema.Schema.AnyNoContext,
    typename,
    version,
    jsonSchema,
    fields,
  }) as unknown as EchoTypeSchema<Self, {}, K, Fields>;
};
