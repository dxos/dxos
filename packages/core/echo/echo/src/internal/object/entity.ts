//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import type * as Types from 'effect/Types';

import { raise } from '@dxos/debug';
import { assertArgument, invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';

import {
  EntityKind,
  type TypeAnnotation,
  TypeAnnotationId,
  type TypeMeta,
  getEntityKind,
  getSchemaTypename,
  getTypeIdentifierAnnotation,
} from '../ast';
import { type HasId, type ToMutable } from '../types';

import { type RelationSourceTargetRefs } from './relation';

// TODO(burdon): Define Schema type for `typename` and use consistently for all DXN-like properties.

// type RequiredKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? never : K }[keyof T];
type EchoTypeSchemaProps<T, ExtraFields = {}> = Types.Simplify<HasId & ToMutable<T> & ExtraFields>;

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
  //   options?: MakeOptions,
  // ): Simplify<Schema.TypeLiteral.Type<Fields, []>>;

  instanceOf(value: unknown): boolean;
}

/**
 * Pipeable function to add ECHO object annotations to a schema.
 */
// TODO(dmaretskyi): Rename EchoObjectSchema.
export const EchoObject: {
  // TODO(burdon): Tighten Self type to Schema.TypeLiteral or Schema.Struct to facilitate definition of `make` method.
  // (meta: TypeMeta): <Self extends Schema.Struct<Fields>, Fields extends Schema.Struct.Fields>(self: Self) => EchoObjectSchema<Self, Fields>;
  (meta: TypeMeta): <Self extends Schema.Schema.Any>(self: Self) => EchoTypeSchema<Self>;
} = ({ typename, version }) => {
  return <Self extends Schema.Schema.Any>(self: Self): EchoTypeSchema<Self> => {
    invariant(typeof TypeAnnotationId === 'symbol', 'Sanity.');
    invariant(SchemaAST.isTypeLiteral(self.ast), 'Schema must be a TypeLiteral.');

    // TODO(dmaretskyi): Does `Schema.mutable` work for deep mutability here?
    // TODO(dmaretskyi): Do not do mutable here.
    const schemaWithId = Schema.extend(Schema.mutable(self), Schema.Struct({ id: Schema.String }));
    const ast = SchemaAST.annotations(schemaWithId.ast, {
      // TODO(dmaretskyi): `extend` kills the annotations.
      ...self.ast.annotations,
      [TypeAnnotationId]: { kind: EntityKind.Object, typename, version } satisfies TypeAnnotation,
      // TODO(dmaretskyi): TypeIdentifierAnnotationId?
      [SchemaAST.JSONSchemaAnnotationId]: makeTypeJsonSchemaAnnotation({
        kind: EntityKind.Object,
        typename,
        version,
      }),
    });

    return makeEchoObjectSchema<Self>(/* self.fields, */ ast, typename, version);
  };
};

export type EchoRelationOptions<
  TSource extends Schema.Schema.AnyNoContext,
  TTarget extends Schema.Schema.AnyNoContext,
> = TypeMeta & {
  source: TSource;
  target: TTarget;
};

// TODO(dmaretskyi): Rename EchoRelationSchema.
export const EchoRelation = <Source extends Schema.Schema.AnyNoContext, Target extends Schema.Schema.AnyNoContext>(
  options: EchoRelationOptions<Source, Target>,
) => {
  assertArgument(Schema.isSchema(options.source), 'source');
  assertArgument(Schema.isSchema(options.target), 'target');
  const sourceDXN = getDXNForRelationSchemaRef(options.source);
  const targetDXN = getDXNForRelationSchemaRef(options.target);
  if (getEntityKind(options.source) !== EntityKind.Object) {
    raise(new Error('Source schema must be an echo object schema.'));
  }
  if (getEntityKind(options.target) !== EntityKind.Object) {
    raise(new Error('Target schema must be an echo object schema.'));
  }

  return <Self extends Schema.Schema.Any>(
    self: Self,
  ): EchoTypeSchema<Self, RelationSourceTargetRefs<Schema.Schema.Type<Source>, Schema.Schema.Type<Target>>> => {
    invariant(SchemaAST.isTypeLiteral(self.ast), 'Schema must be a TypeLiteral.');

    // TODO(dmaretskyi): Does `Schema.mutable` work for deep mutability here?
    // TODO(dmaretskyi): Do not do mutable here.
    const schemaWithId = Schema.extend(Schema.mutable(self), Schema.Struct({ id: Schema.String }));
    const ast = SchemaAST.annotations(schemaWithId.ast, {
      // TODO(dmaretskyi): `extend` kills the annotations.
      ...self.ast.annotations,
      [TypeAnnotationId]: {
        kind: EntityKind.Relation,
        typename: options.typename,
        version: options.version,
        sourceSchema: sourceDXN,
        targetSchema: targetDXN,
      } satisfies TypeAnnotation,
      // TODO(dmaretskyi): TypeIdentifierAnnotationId?

      [SchemaAST.JSONSchemaAnnotationId]: makeTypeJsonSchemaAnnotation({
        kind: EntityKind.Relation,
        typename: options.typename,
        version: options.version,
        relationSource: sourceDXN,
        relationTarget: targetDXN,
      }),
    });

    return makeEchoObjectSchema<Self>(/* self.fields, */ ast, options.typename, options.version);
  };
};

/**
 * @returns JSON-schema annotation so that the schema can be serialized with correct parameters.
 */
export const makeTypeJsonSchemaAnnotation = (options: {
  identifier?: string;
  kind: EntityKind;
  typename: string;
  version: string;
  relationSource?: string;
  relationTarget?: string;
}) => {
  assertArgument(!!options.relationSource === (options.kind === EntityKind.Relation), 'relationSource');
  assertArgument(!!options.relationTarget === (options.kind === EntityKind.Relation), 'relationTarget');

  const obj = {
    // TODO(dmaretskyi): Should this include the version?
    $id: options.identifier ?? DXN.fromTypename(options.typename).toString(),
    entityKind: options.kind,
    version: options.version,
    typename: options.typename,
  } as any;
  if (options.kind === EntityKind.Relation) {
    obj.relationSource = { $ref: options.relationSource };
    obj.relationTarget = { $ref: options.relationTarget };
  }
  return obj;
};

const getDXNForRelationSchemaRef = (schema: Schema.Schema.Any): string => {
  assertArgument(Schema.isSchema(schema), 'schema');
  const identifier = getTypeIdentifierAnnotation(schema);
  if (identifier) {
    return identifier;
  }

  const typename = getSchemaTypename(schema);
  if (!typename) {
    throw new Error('Schema must have a typename');
  }

  return DXN.fromTypename(typename).toString();
};

// type MakeOptions =
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

// const _getDisableValidationMakeOption = (options: MakeOptions | undefined): boolean =>
//   Predicate.isBoolean(options) ? options : options?.disableValidation ?? false;

const makeEchoObjectSchema = <Self extends Schema.Schema.Any>(
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
      return makeEchoObjectSchema<Self>(/* fields, */ schema.ast, typename, version);
    }

    // static make(
    //   props: RequiredKeys<Schema.TypeLiteral.Constructor<Fields, []>> extends never
    //     ? void | Simplify<Schema.TypeLiteral.Constructor<Fields, []>>
    //     : Simplify<Schema.TypeLiteral.Constructor<Fields, []>>,
    //   options?: MakeOptions,
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
