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
 * Base type.
 */
// TODO(burdon): Combine AbstractSchema with AbstractTypedObject?
export interface AbstractSchema<Fields = any, I = any> extends S.Schema<Fields, I> {
  /** Fully qualified type name. */
  readonly typename: string;
}

/**
 * Marker interface for typed objects (for type inference).
 */
export interface AbstractTypedObject<Fields = any, I = any> extends AbstractSchema<Fields, I> {
  /** Type constructor. */
  new (): HasId & Fields;
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
  ): AbstractTypedObject<TypedObjectFields<SchemaFields, Options>, S.Struct.Encoded<SchemaFields>> => {
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
    // TODO(burdon): This is missing fields required by AbstractTypedObject (e.g., Type, Encoded, Context)?
    return class {
      // Implement AbstractSchema properties.
      static readonly typename = typename;

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
