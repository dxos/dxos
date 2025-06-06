//
// Copyright 2024 DXOS.org
//

import { flow, pipe, Option, Predicate, Schema, SchemaAST, type Types } from 'effect';

import { raise } from '@dxos/debug';
import { getField, type JsonPath } from '@dxos/effect';
import { assertArgument, invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { type Primitive } from '@dxos/util';

import { createAnnotationHelper } from './annotation-helper';
import { type RelationSourceTargetRefs } from '../object'; // TODO(burdon): ???
import { type HasId, type BaseObject, EntityKind } from '../types';

type ToMutable<T> = T extends BaseObject
  ? { -readonly [K in keyof T]: T[K] extends readonly (infer U)[] ? U[] : T[K] }
  : T;

/**
 * ECHO identifier (for a stored schema).
 * Must be a `dxn:echo:` URI.
 */
export const TypeIdentifierAnnotationId = Symbol.for('@dxos/schema/annotation/TypeIdentifier');

export const getTypeIdentifierAnnotation = (schema: Schema.Schema.All) =>
  flow(
    SchemaAST.getAnnotation<string>(TypeIdentifierAnnotationId),
    Option.getOrElse(() => undefined),
  )(schema.ast);

/**
 * ECHO type.
 */
export const TypeAnnotationId = Symbol.for('@dxos/schema/annotation/Type');

export const Typename = Schema.String.pipe(Schema.pattern(/^[a-zA-Z]\w+\.[a-zA-Z]\w{1,}\/[\w/_-]+$/));
export const Version = Schema.String.pipe(Schema.pattern(/^\d+.\d+.\d+$/));

/**
 * Payload stored under {@link TypeAnnotationId}.
 */
// TODO(dmaretskyi): Rename getTypeAnnotation to represent commonality between objects and relations (e.g. `entity`).
export const TypeAnnotation = Schema.Struct({
  kind: Schema.Enums(EntityKind),
  typename: Typename,
  version: Version,

  /**
   * If this is a relation, the schema of the source object.
   * Must be present if entity kind is {@link EntityKind.Relation}.
   */
  sourceSchema: Schema.optional(DXN.Schema),

  /**
   * If this is a relation, the schema of the target object.
   * Must be present if entity kind is {@link EntityKind.Relation}.
   */
  targetSchema: Schema.optional(DXN.Schema),
});

export interface TypeAnnotation extends Schema.Schema.Type<typeof TypeAnnotation> {}

export type TypeMeta = Pick<TypeAnnotation, 'typename' | 'version'>;

/**
 * @returns {@link TypeAnnotation} from a schema.
 * Schema must have been created with {@link TypedObject} or {@link TypedLink} or manually assigned an appropriate annotation.
 */
export const getTypeAnnotation = (schema: Schema.Schema.All): TypeAnnotation | undefined => {
  assertArgument(schema != null && schema.ast != null, 'invalid schema');
  return flow(
    SchemaAST.getAnnotation<TypeAnnotation>(TypeAnnotationId),
    Option.getOrElse(() => undefined),
  )(schema.ast);
};

/**
 * @returns {@link EntityKind} from a schema.
 */
export const getEntityKind = (schema: Schema.Schema.All): EntityKind | undefined => getTypeAnnotation(schema)?.kind;

/**
 * @deprecated Use {@link getTypeAnnotation} instead.
 * @returns Schema typename (without dxn: prefix or version number).
 */
// TODO(burdon): Rename getTypename. (dmaretskyi): Would conflict with the `getTypename` getter for objects.
export const getSchemaTypename = (schema: Schema.Schema.All): string | undefined => getTypeAnnotation(schema)?.typename;

/**
 * @deprecated Use {@link getTypeAnnotation} instead.
 * @returns Schema version in semver format.
 */
export const getSchemaVersion = (schema: Schema.Schema.All): string | undefined => getTypeAnnotation(schema)?.version;

//
// MOVE TO OBJECT
//

/**
 * Pipeable function to add ECHO object annotations to a schema.
 */
// TODO(burdon): Rename EchoType.
export const EchoObject: {
  // TODO(burdon): Tighten Self type to Schema.TypeLiteral or Schema.Struct to facilitate definition of `make` method.
  // (meta: TypeMeta): <Self extends Schema.Struct<Fields>, Fields extends Schema.Struct.Fields>(self: Self) => EchoObjectSchema<Self, Fields>;
  (meta: TypeMeta): <Self extends Schema.Schema.Any>(self: Self) => EchoTypeSchema<Self>;
} = ({ typename, version }) => {
  return <Self extends Schema.Schema.Any>(self: Self): EchoTypeSchema<Self> => {
    invariant(SchemaAST.isTypeLiteral(self.ast), 'Schema must be a TypeLiteral.');

    // TODO(dmaretskyi): Does `Schema.mutable` work for deep mutability here?
    // TODO(dmaretskyi): Do not do mutable here.
    const schemaWithId = Schema.extend(Schema.mutable(self), Schema.Struct({ id: Schema.String }));
    const ast = SchemaAST.annotations(schemaWithId.ast, {
      // TODO(dmaretskyi): `extend` kills the annotations.
      ...self.ast.annotations,
      [TypeAnnotationId]: { kind: EntityKind.Object, typename, version } satisfies TypeAnnotation,
      // TODO(dmaretskyi): TypeIdentifierAnnotationId?
    });

    return makeEchoObjectSchema<Self>(/* self.fields, */ ast, typename, version);
  };
};

type EchoRelationOptions<TSource extends Schema.Schema.AnyNoContext, TTarget extends Schema.Schema.AnyNoContext> = {
  typename: string;
  version: string;
  source: TSource;
  target: TTarget;
};

const getDXNForRelationSchemaRef = (schema: Schema.Schema.Any): string => {
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
export const EchoRelation = <Source extends Schema.Schema.AnyNoContext, Target extends Schema.Schema.AnyNoContext>(
  options: EchoRelationOptions<Source, Target>,
) => {
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
    });

    return makeEchoObjectSchema<Self>(/* self.fields, */ ast, options.typename, options.version);
  };
};

// type RequiredKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? never : K }[keyof T];
type EchoTypeSchemaProps<T, ExtraFields = {}> = Types.Simplify<HasId & ToMutable<T> & ExtraFields>;
type MakeOptions =
  | boolean
  | {
      readonly disableValidation?: boolean;
    };

// NOTE: Utils copied from Effect `Schema.ts`.
const _ownKeys = (o: object): Array<PropertyKey> =>
  (Object.keys(o) as Array<PropertyKey>).concat(Object.getOwnPropertySymbols(o));

const _lazilyMergeDefaults = (
  fields: Schema.Struct.Fields,
  out: Record<PropertyKey, unknown>,
): { [x: string | symbol]: unknown } => {
  const ownKeys = _ownKeys(fields);
  for (const key of ownKeys) {
    const field = fields[key];
    if (out[key] === undefined && Schema.isPropertySignature(field)) {
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
  return <A, I, R>(self: Schema.Schema<A, I, R>): Schema.Schema<A, I, R> => {
    const existingMeta = self.ast.annotations[PropertyMetaAnnotationId] as PropertyMetaAnnotation;
    return self.annotations({
      [PropertyMetaAnnotationId]: {
        ...existingMeta,
        [name]: value,
      },
    });
  };
};

export const getPropertyMetaAnnotation = <T>(prop: SchemaAST.PropertySignature, name: string) =>
  pipe(
    SchemaAST.getAnnotation<PropertyMetaAnnotation>(PropertyMetaAnnotationId)(prop.type),
    Option.map((meta) => meta[name] as T),
    Option.getOrElse(() => undefined),
  );

/**
 * Schema reference.
 */
export const ReferenceAnnotationId = Symbol.for('@dxos/schema/annotation/Reference');

export type ReferenceAnnotationValue = TypeAnnotation;

export const getReferenceAnnotation = (schema: Schema.Schema.AnyNoContext) =>
  pipe(
    SchemaAST.getAnnotation<ReferenceAnnotationValue>(ReferenceAnnotationId)(schema.ast),
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
export const LabelAnnotationId = Symbol.for('@dxos/schema/annotation/Label');

export const LabelAnnotation = createAnnotationHelper<string[]>(LabelAnnotationId);

/**
 * Default field to be used on referenced schema to lookup the value.
 */
export const FieldLookupAnnotationId = Symbol.for('@dxos/schema/annotation/FieldLookup');

/**
 * Generate test data.
 */
export const GeneratorAnnotationId = Symbol.for('@dxos/schema/annotation/Generator');

export type GeneratorAnnotationValue = {
  generator: string;
  probability?: number;
};

export const GeneratorAnnotation = createAnnotationHelper<string | GeneratorAnnotationValue>(GeneratorAnnotationId);

/**
 * Returns the label for a given object based on {@link LabelAnnotationId}.
 */
// TODO(burdon): This is really a title, not a label.
// TODO(burdon): Convert to JsonPath?
export const getLabel = <S extends Schema.Schema.Any>(schema: S, object: Schema.Schema.Type<S>): string | undefined => {
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
