//
// Copyright 2024 DXOS.org
//

import { SchemaAST as AST, flow, Option, pipe, Predicate, Schema as S } from 'effect';
import { isPropertySignature } from 'effect/Schema';
import { type Simplify } from 'effect/Types';

import { raise } from '@dxos/debug';
import { getField, type JsonPath } from '@dxos/effect';
import { assertArgument, invariant } from '@dxos/invariant';
import { type Primitive } from '@dxos/util';

import { DXN as DXNSchema } from '../formats';
import { DXN } from '@dxos/keys';
import type { RelationSourceTargetRefs } from '../object';
import { type BaseObject } from '../types';
import { EntityKind } from './entity-kind';
import { type HasId } from './types';

type ToMutable<T> = T extends BaseObject
  ? { -readonly [K in keyof T]: T[K] extends readonly (infer U)[] ? U[] : T[K] }
  : T;

/**
 * ECHO identifier (for a stored schema).
 * Must be a `dxn:echo:` URI.
 */
export const TypeIdentifierAnnotationId = Symbol.for('@dxos/schema/annotation/TypeIdentifier');

export const getTypeIdentifierAnnotation = (schema: S.Schema.All) =>
  flow(
    AST.getAnnotation<string>(TypeIdentifierAnnotationId),
    Option.getOrElse(() => undefined),
  )(schema.ast);

/**
 * ECHO type.
 */
export const TypeAnnotationId = Symbol.for('@dxos/schema/annotation/Type');

export const Typename = S.String.pipe(S.pattern(/^[a-zA-Z]\w+\.[a-zA-Z]\w{1,}\/[\w/_-]+$/));
export const Version = S.String.pipe(S.pattern(/^\d+.\d+.\d+$/));

/**
 * Payload stored under {@link TypeAnnotationId}.
 */
// TODO(dmaretskyi): Rename getTypeAnnotation to represent commonality between objects and relations (e.g. `entity`).
export const TypeAnnotation = S.Struct({
  kind: S.Enums(EntityKind),
  typename: Typename,
  version: Version,

  /**
   * If this is a relation, the schema of the source object.
   * Must be present if entity kind is {@link EntityKind.Relation}.
   */
  sourceSchema: S.optional(DXNSchema),

  /**
   * If this is a relation, the schema of the target object.
   * Must be present if entity kind is {@link EntityKind.Relation}.
   */
  targetSchema: S.optional(DXNSchema),
});

export interface TypeAnnotation extends S.Schema.Type<typeof TypeAnnotation> {}

export type TypeMeta = Pick<TypeAnnotation, 'typename' | 'version'>;

/**
 * @returns {@link TypeAnnotation} from a schema.
 * Schema must have been created with {@link TypedObject} or {@link TypedLink} or manually assigned an appropriate annotation.
 */
export const getTypeAnnotation = (schema: S.Schema.All): TypeAnnotation | undefined =>
  flow(
    AST.getAnnotation<TypeAnnotation>(TypeAnnotationId),
    Option.getOrElse(() => undefined),
  )(schema.ast);

/**
 * @returns {@link EntityKind} from a schema.
 */
export const getEntityKind = (schema: S.Schema.All): EntityKind | undefined => getTypeAnnotation(schema)?.kind;

/**
 * @returns Schema typename (without dxn: prefix or version number).
 */
// TODO(burdon): Rename getTypename. (dmaretskyi): Would conflict with the `getTypename` getter for objects; (burdon): Use namespaces.
export const getSchemaTypename = (schema: S.Schema.All): string | undefined => getTypeAnnotation(schema)?.typename;

/**
 * @returns Schema version in semver format.
 */
export const getSchemaVersion = (schema: S.Schema.All): string | undefined => getTypeAnnotation(schema)?.version;

/**
 * Pipeable function to add ECHO object annotations to a schema.
 */
// TODO(burdon): Rename EchoType.
export const EchoObject: {
  // TODO(burdon): Tighten Self type to S.TypeLiteral or S.Struct to facilitate definition of `make` method.
  // (meta: TypeMeta): <Self extends S.Struct<Fields>, Fields extends S.Struct.Fields>(self: Self) => EchoObjectSchema<Self, Fields>;
  (meta: TypeMeta): <Self extends S.Schema.Any>(self: Self) => EchoTypeSchema<Self>;
} = ({ typename, version }) => {
  return <Self extends S.Schema.Any>(self: Self): EchoTypeSchema<Self> => {
    invariant(AST.isTypeLiteral(self.ast), 'Schema must be a TypeLiteral.');

    // TODO(dmaretskyi): Does `S.mutable` work for deep mutability here?
    // TODO(dmaretskyi): Do not do mutable here.
    const schemaWithId = S.extend(S.mutable(self), S.Struct({ id: S.String }));
    const ast = AST.annotations(schemaWithId.ast, {
      // TODO(dmaretskyi): `extend` kills the annotations.
      ...self.ast.annotations,
      [TypeAnnotationId]: { kind: EntityKind.Object, typename, version } satisfies TypeAnnotation,
      // TODO(dmaretskyi): TypeIdentifierAnnotationId?
    });

    return makeEchoObjectSchema<Self>(/* self.fields, */ ast, typename, version);
  };
};

type EchoRelationOptions<TSource extends S.Schema.AnyNoContext, TTarget extends S.Schema.AnyNoContext> = {
  typename: string;
  version: string;
  source: TSource;
  target: TTarget;
};

const getDXNForRelationSchemaRef = (schema: S.Schema.Any): string => {
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

// TODO(dmaretskyi): Rename?
export const EchoRelation = <TSource extends S.Schema.AnyNoContext, TTarget extends S.Schema.AnyNoContext>(
  options: EchoRelationOptions<TSource, TTarget>,
) => {
  const sourceDXN = getDXNForRelationSchemaRef(options.source);
  const targetDXN = getDXNForRelationSchemaRef(options.target);
  if (getEntityKind(options.source) !== EntityKind.Object) {
    raise(new Error('Source schema must be an echo object schema.'));
  }
  if (getEntityKind(options.target) !== EntityKind.Object) {
    raise(new Error('Target schema must be an echo object schema.'));
  }

  return <Self extends S.Schema.Any>(
    self: Self,
  ): EchoTypeSchema<Self, RelationSourceTargetRefs<S.Schema.Type<TSource>, S.Schema.Type<TTarget>>> => {
    invariant(AST.isTypeLiteral(self.ast), 'Schema must be a TypeLiteral.');

    // TODO(dmaretskyi): Does `S.mutable` work for deep mutability here?
    // TODO(dmaretskyi): Do not do mutable here.
    const schemaWithId = S.extend(S.mutable(self), S.Struct({ id: S.String }));
    const ast = AST.annotations(schemaWithId.ast, {
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
    });

    return makeEchoObjectSchema<Self>(/* self.fields, */ ast, options.typename, options.version);
  };
};

// type RequiredKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? never : K }[keyof T];
type EchoTypeSchemaProps<T, ExtraFields = {}> = Simplify<HasId & ToMutable<T> & ExtraFields>;
type MakeOptions =
  | boolean
  | {
      readonly disableValidation?: boolean;
    };

// NOTE: Utils copied from Effect `Schema.ts`.
const _ownKeys = (o: object): Array<PropertyKey> =>
  (Object.keys(o) as Array<PropertyKey>).concat(Object.getOwnPropertySymbols(o));

const _lazilyMergeDefaults = (
  fields: S.Struct.Fields,
  out: Record<PropertyKey, unknown>,
): { [x: string | symbol]: unknown } => {
  const ownKeys = _ownKeys(fields);
  for (const key of ownKeys) {
    const field = fields[key];
    if (out[key] === undefined && isPropertySignature(field)) {
      const ast = field.ast;
      const defaultValue = ast._tag === 'PropertySignatureDeclaration' ? ast.defaultValue : ast.to.defaultValue;
      if (defaultValue !== undefined) {
        out[key] = defaultValue();
      }
    }
  }
  return out;
};

const _getDisableValidationMakeOption = (options: MakeOptions | undefined): boolean =>
  Predicate.isBoolean(options) ? options : options?.disableValidation ?? false;

export interface EchoTypeSchema<Self extends S.Schema.Any, ExtraFields = {}>
  extends TypeMeta,
    S.AnnotableClass<
      EchoTypeSchema<Self, ExtraFields>,
      EchoTypeSchemaProps<S.Schema.Type<Self>, ExtraFields>,
      EchoTypeSchemaProps<S.Schema.Encoded<Self>, ExtraFields>,
      S.Schema.Context<Self>
    > {
  // make(
  //   props: RequiredKeys<S.TypeLiteral.Constructor<Fields, []>> extends never
  //     ? void | Simplify<S.TypeLiteral.Constructor<Fields, []>>
  //     : Simplify<S.TypeLiteral.Constructor<Fields, []>>,
  //   options?: MakeOptions,
  // ): Simplify<S.TypeLiteral.Type<Fields, []>>;

  instanceOf(value: unknown): boolean;
}

const makeEchoObjectSchema = <Self extends S.Schema.Any>(
  // fields: Fields,
  ast: AST.AST,
  typename: string,
  version: string,
): EchoTypeSchema<Self> => {
  return class EchoObjectSchemaClass extends S.make<
    EchoTypeSchemaProps<S.Schema.Type<Self>>,
    EchoTypeSchemaProps<S.Schema.Encoded<Self>>,
    S.Schema.Context<Self>
  >(ast) {
    static readonly typename = typename;
    static readonly version = version;

    static override annotations(
      annotations: S.Annotations.GenericSchema<EchoTypeSchemaProps<S.Schema.Type<Self>>>,
    ): EchoTypeSchema<Self> {
      const schema = S.make<EchoTypeSchemaProps<S.Schema.Type<Self>>>(ast).annotations(annotations);
      return makeEchoObjectSchema<Self>(/* fields, */ schema.ast, typename, version);
    }

    // static make(
    //   props: RequiredKeys<S.TypeLiteral.Constructor<Fields, []>> extends never
    //     ? void | Simplify<S.TypeLiteral.Constructor<Fields, []>>
    //     : Simplify<S.TypeLiteral.Constructor<Fields, []>>,
    //   options?: MakeOptions,
    // ): Simplify<S.TypeLiteral.Type<Fields, []>> {
    //   const propsWithDefaults: any = _lazilyMergeDefaults(fields, { ...(props as any) });
    //   return _getDisableValidationMakeOption(options)
    //     ? propsWithDefaults
    //     : ParseResult.validateSync(this)(propsWithDefaults);
    // }

    static instanceOf(value: unknown): boolean {
      return S.is(this)(value);
    }
  };
};

/**
 * PropertyMeta (metadata for dynamic schema properties).
 * For user-defined annotations.
 */
export const PropertyMetaAnnotationId = Symbol.for('@dxos/schema/annotation/PropertyMeta');

export type PropertyMetaValue = Primitive | Record<string, Primitive> | Primitive[];

export type PropertyMetaAnnotation = {
  [name: string]: PropertyMetaValue;
};

export const PropertyMeta = (name: string, value: PropertyMetaValue) => {
  return <A, I, R>(self: S.Schema<A, I, R>): S.Schema<A, I, R> => {
    const existingMeta = self.ast.annotations[PropertyMetaAnnotationId] as PropertyMetaAnnotation;
    return self.annotations({
      [PropertyMetaAnnotationId]: {
        ...existingMeta,
        [name]: value,
      },
    });
  };
};

export const getPropertyMetaAnnotation = <T>(prop: AST.PropertySignature, name: string) =>
  pipe(
    AST.getAnnotation<PropertyMetaAnnotation>(PropertyMetaAnnotationId)(prop.type),
    Option.map((meta) => meta[name] as T),
    Option.getOrElse(() => undefined),
  );

/**
 * Schema reference.
 */
export const ReferenceAnnotationId = Symbol.for('@dxos/schema/annotation/Reference');

export type ReferenceAnnotationValue = TypeAnnotation;

export const getReferenceAnnotation = (schema: S.Schema.AnyNoContext) =>
  pipe(
    AST.getAnnotation<ReferenceAnnotationValue>(ReferenceAnnotationId)(schema.ast),
    Option.getOrElse(() => undefined),
  );

/**
 * SchemaMeta.
 */
export const SchemaMetaSymbol = Symbol.for('@dxos/schema/SchemaMeta');

export type SchemaMeta = TypeMeta & { id: string };

/**
 * Identifies label property or JSON path expression.
 * Either a string or an array of strings representing field accessors each matched in priority order.
 */
// TODO(burdon): Move to property.
// TODO(dmaretskyi): - Why move to property? Putting it on type level allows to set label field precedence.
export const LabelAnnotationId = Symbol.for('@dxos/schema/annotation/Label');

/**
 * Default field to be used on referenced schema to lookup the value.
 */
export const FieldLookupAnnotationId = Symbol.for('@dxos/schema/annotation/FieldLookup');

/**
 * Generate test data.
 */
export const GeneratorAnnotationId = Symbol.for('@dxos/schema/annotation/Generator');

/**
 * Returns the label for a given object based on {@link LabelAnnotationId}.
 */
// TODO(burdon): Convert to JsonPath?
export const getLabel = <S extends S.Schema.Any>(schema: S, object: S.Schema.Type<S>): string | undefined => {
  let annotation = schema.ast.annotations[LabelAnnotationId];
  if (!annotation) {
    return undefined;
  }
  if (!Array.isArray(annotation)) {
    annotation = [annotation];
  }

  for (const accessor of annotation as string[]) {
    assertArgument(typeof accessor === 'string', 'Label annotation must be a string or an array of strings');
    const value = getField(object, accessor as JsonPath);
    switch (typeof value) {
      case 'string':
      case 'number':
      case 'boolean':
      case 'bigint':
      case 'symbol':
        return value.toString();
      case 'undefined':
      case 'object':
      case 'function':
        continue;
    }
  }

  return undefined;
};
