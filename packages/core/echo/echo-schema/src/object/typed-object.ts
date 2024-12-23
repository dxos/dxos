//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/effect';

import { getTypename } from './typename';
import {
  type HasId,
  type ObjectAnnotation,
  ObjectAnnotationId,
  schemaVariance,
  TYPENAME_REGEX,
  VERSION_REGEX,
} from '../ast';

/**
 * Definition for an object type that can be stored in an ECHO database.
 * Implements effect schema to define object properties.
 * Has a typename and version.
 *
 * In contrast to {@link EchoSchema} this definition is not recorded in the database.
 */
export interface TypedObject<A = any, I = any> extends S.Schema<A, I> {
  /** Fully qualified type name. */
  readonly typename: string;

  /**
   * Semver schema version.
   */
  readonly version: string;
}

/**
 * Typed object that could be used as a prototype in class definitions.
 * This is an internal API type.
 * Use {@link TypedObject} for the common use-cases.
 */
export interface TypedObjectPrototype<A = any, I = any> extends TypedObject<A, I> {
  /** Type constructor. */
  new (): HasId & A;
}

type TypedObjectProps = ObjectAnnotation & {
  // TODO(dmaretskyi): Remove after all legacy types has been removed. (burdon): Can do this now (after 0.7).
  skipTypenameFormatCheck?: boolean;
};

export type TypedObjectOptions = {
  partial?: true;
  record?: true;
};

/**
 *
 */
// TODO(burdon): Comment required.
type SimplifiedSchemaFields<
  SchemaFields extends S.Struct.Fields,
  Options extends TypedObjectOptions,
> = Options['partial'] extends boolean
  ? S.SimplifyMutable<Partial<S.Struct.Type<SchemaFields>>>
  : S.SimplifyMutable<S.Struct.Type<SchemaFields>>;

/**
 *
 */
// TODO(burdon): Comment required.
type TypedObjectFields<
  SchemaFields extends S.Struct.Fields,
  Options extends TypedObjectOptions,
> = SimplifiedSchemaFields<SchemaFields, Options> & { id: string } & (Options['record'] extends boolean
    ? S.SimplifyMutable<S.IndexSignature.Type<S.IndexSignature.Records>>
    : {});

/**
 * Base class factory for typed objects.
 */
// TODO(burdon): Can this be flattened into a single function (e.g., `class X extends TypedObject({})`).
// TODO(burdon): Support pipe(S.default({}))
export const TypedObject = <ClassType>({ typename, version, skipTypenameFormatCheck }: TypedObjectProps) => {
  if (!skipTypenameFormatCheck) {
    if (!TYPENAME_REGEX.test(typename)) {
      throw new TypeError(`Invalid typename: ${typename}`);
    }
    if (!VERSION_REGEX.test(version)) {
      throw new TypeError(`Invalid version: ${version}`);
    }
  }

  /**
   * Return class definition factory.
   */
  return <SchemaFields extends S.Struct.Fields, Options extends TypedObjectOptions>(
    fields: SchemaFields,
    options?: Options,
  ): TypedObjectPrototype<TypedObjectFields<SchemaFields, Options>, S.Struct.Encoded<SchemaFields>> => {
    // Create schema from fields.
    const schema: S.Schema.All = options?.record ? S.Struct(fields, { key: S.String, value: S.Any }) : S.Struct(fields);

    // Set ECHO object id property.
    const typeSchema = S.extend(S.mutable(options?.partial ? S.partial(schema) : schema), S.Struct({ id: S.String }));

    // Set ECHO annotations.
    const annotatedSchema = typeSchema.annotations({
      [ObjectAnnotationId]: { typename, version },
    });

    /**
     * Return class definition.
     * NOTE: Actual reactive ECHO objects must be created via the `create(Type)` function.
     */
    // TODO(burdon): This is missing fields required by TypedObject (e.g., Type, Encoded, Context)?
    return class {
      // Implement TypedObject properties.
      static readonly typename = typename;

      static readonly version = version;

      // TODO(burdon): Comment required.
      static [Symbol.hasInstance](obj: unknown): obj is ClassType {
        return obj != null && getTypename(obj) === typename;
      }

      // Implement S.Schema properties.
      // TODO(burdon): Comment required.
      static readonly [S.TypeId] = schemaVariance;
      static readonly ast = annotatedSchema.ast;
      static readonly annotations = annotatedSchema.annotations.bind(annotatedSchema);
      static readonly pipe = annotatedSchema.pipe.bind(annotatedSchema);

      // TODO(burdon): Throw APIError.
      private constructor() {
        throw new Error('Use create(Typename, { ...fields }) to instantiate an object.');
      }
    } as any;
  };
};
