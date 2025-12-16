//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import type * as SchemaAST from 'effect/SchemaAST';
import type * as Types from 'effect/Types';

import { type ToMutable } from '@dxos/util';

import { type TypeMeta } from '../annotations';
import { type HasId } from '../types';

// TODO(burdon): Define Schema type for `typename` and use consistently for all DXN-like properties.

// type RequiredKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? never : K }[keyof T];
export type EchoTypeSchemaProps<T, ExtraFields = {}> = Types.Simplify<HasId & ToMutable<T> & ExtraFields>;

// TODO(burdon): Rename EchoEntitySchema.
export interface EchoTypeSchema<Self extends Schema.Schema.Any, ExtraFields = {}>
  extends TypeMeta,
    Schema.AnnotableClass<
      EchoTypeSchema<Self, ExtraFields>,
      EchoTypeSchemaProps<Schema.Schema.Type<Self>, ExtraFields>,
      EchoTypeSchemaProps<Schema.Schema.Encoded<Self>, ExtraFields>,
      Schema.Schema.Context<Self>
    > {
  // make(
  //   props: RequiredKeys<Schema.TypeLiteral.Constructor<Fields, []>> extends never
  //     ? void | Simplify<Schema.TypeLiteral.Constructor<Fields, []>>
  //     : Simplify<Schema.TypeLiteral.Constructor<Fields, []>>,
  //   options?: MakeProps,
  // ): Simplify<Schema.TypeLiteral.Type<Fields, []>>;

  instanceOf(value: unknown): boolean;
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
 */
export const makeEchoTypeSchema = <Self extends Schema.Schema.Any>(
  // fields: Fields,
  ast: SchemaAST.AST,
  typename: string,
  version: string,
): EchoTypeSchema<Self> => {
  return class EchoObjectSchemaClass extends Schema.make<
    EchoTypeSchemaProps<Schema.Schema.Type<Self>>,
    EchoTypeSchemaProps<Schema.Schema.Encoded<Self>>,
    Schema.Schema.Context<Self>
  >(ast) {
    static readonly typename = typename;
    static readonly version = version;

    static override annotations(
      annotations: Schema.Annotations.GenericSchema<EchoTypeSchemaProps<Schema.Schema.Type<Self>>>,
    ): EchoTypeSchema<Self> {
      const schema = Schema.make<EchoTypeSchemaProps<Schema.Schema.Type<Self>>>(ast).annotations(annotations);
      return makeEchoTypeSchema<Self>(/* fields, */ schema.ast, typename, version);
    }

    // static make(
    //   props: RequiredKeys<Schema.TypeLiteral.Constructor<Fields, []>> extends never
    //     ? void | Simplify<Schema.TypeLiteral.Constructor<Fields, []>>
    //     : Simplify<Schema.TypeLiteral.Constructor<Fields, []>>,
    //   options?: MakeProps,
    // ): Simplify<Schema.TypeLiteral.Type<Fields, []>> {
    //   const propsWithDefaults: any = _lazilyMergeDefaults(fields, { ...(props as any) });
    //   return _getDisableValidationMakeOption(options)
    //     ? propsWithDefaults
    //     : ParseResult.validateSync(this)(propsWithDefaults);
    // }

    static instanceOf(value: unknown): boolean {
      return Schema.is(this)(value);
    }
  };
};
