//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/effect';

import { type ObjectAnnotation, ObjectAnnotationId, schemaVariance } from '../ast';
import { getSchema, getTypeReference } from '../proxy';

/**
 * Base type.
 */
export interface AbstractSchema<Fields = any, I = any> extends S.Schema<Fields, I> {
  /** Fully qualified type name. */
  readonly typename: string;
}

/**
 * Marker interface for typed objects (for type inference).
 */
export interface AbstractTypedObject<Fields, I> extends AbstractSchema<Fields, I> {
  /** Type constructor. */
  new (): Fields;
}

const TYPENAME_REGEX = /^\w+\.\w{2,}\/[\w/]+$/;
const VERSION_REGEX = /^\d+.\d+.\d+$/;

export type TypedObjectOptions = {
  partial?: true;
  record?: true;
};

type TypedObjectProps = ObjectAnnotation & {
  // TODO(dmaretskyi): Remove after all legacy types has been removed.
  skipTypenameFormatCheck?: boolean;
};

/**
 * Base class factory for typed objects.
 */
// TODO(burdon): Document this and define a return type.
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

  return <
    Options extends TypedObjectOptions,
    SchemaFields extends S.Struct.Fields,
    SimplifiedFields = Options['partial'] extends boolean
      ? S.SimplifyMutable<Partial<S.Struct.Type<SchemaFields>>>
      : S.SimplifyMutable<S.Struct.Type<SchemaFields>>,
    Fields = SimplifiedFields & { id: string } & (Options['record'] extends boolean
        ? S.SimplifyMutable<S.IndexSignature.Type<S.IndexSignature.Records>>
        : {}),
  >(
    fields: SchemaFields,
    options?: Options,
  ): AbstractTypedObject<Fields, S.Struct.Encoded<SchemaFields>> => {
    const fieldsSchema = options?.record ? S.Struct(fields, { key: S.String, value: S.Any }) : S.Struct(fields);
    // Ok to perform `as any` cast here since the types are explicitly defined.
    const schemaWithModifiers = S.mutable(options?.partial ? S.partial(fieldsSchema as any) : fieldsSchema);
    // Set ECHO object id property.
    const typeSchema = S.extend(schemaWithModifiers, S.Struct({ id: S.String }));
    const annotatedSchema = typeSchema.annotations({
      [ObjectAnnotationId]: { typename, version },
    });

    return class {
      static readonly typename = typename;

      // TODO(burdon): Comment.
      static [Symbol.hasInstance](obj: unknown): obj is ClassType {
        return obj != null && getTypeReference(getSchema(obj))?.objectId === typename;
      }

      // TODO(burdon): Comment.
      static readonly [S.TypeId] = schemaVariance;

      static readonly ast = annotatedSchema.ast;
      static readonly annotations = annotatedSchema.annotations.bind(annotatedSchema);
      static readonly pipe = annotatedSchema.pipe.bind(annotatedSchema);

      private constructor() {
        // TODO(burdon): Throw APIError.
        throw new Error('Use create(Typename, { ...fields }) to instantiate an object.');
      }
    } as any; // TODO(burdon): Comment.
  };
};
