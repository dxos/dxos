//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/effect';
import { invariant } from '@dxos/invariant';

import { type ObjectAnnotation, ObjectAnnotationId, schemaVariance } from '../ast';
import { getSchema, getTypeReference } from '../proxy';

/**
 * Marker interface for typed objects (for type inference).
 */
export interface AbstractTypedObject<Fields, I> extends S.Schema<Fields, I> {
  // Type constructor.
  new (): Fields;

  // Fully qualified type name.
  readonly typename: string;
}

export type TypedObjectOptions = {
  partial?: true;
  record?: true;
};

const SCHEMA_REGEX = /^\w+\.\w{2,}\/[\w/]+$/;

/**
 * Base class factory for typed objects.
 */
// TODO(burdon): Support pipe(S.default({}))
export const TypedObject = <Klass>(args: ObjectAnnotation) => {
  const { typename } = args;
  invariant(SCHEMA_REGEX.test(typename), `Invalid typename: ${typename}`);

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
    const schemaWithModifiers = S.mutable(options?.partial ? S.partial(fieldsSchema as any) : fieldsSchema); // Ok to perform `as any` cast here since the types are explicitly defined.
    const typeSchema = S.extend(schemaWithModifiers, S.Struct({ id: S.String }));
    const annotatedSchema = typeSchema.annotations({
      [ObjectAnnotationId]: { typename: args.typename, version: args.version },
    });

    return class {
      static readonly typename = args.typename;
      static [Symbol.hasInstance](obj: unknown): obj is Klass {
        return obj != null && getTypeReference(getSchema(obj))?.objectId === args.typename;
      }

      static readonly ast = annotatedSchema.ast;
      static readonly [S.TypeId] = schemaVariance;
      static readonly annotations = annotatedSchema.annotations.bind(annotatedSchema);
      static readonly pipe = annotatedSchema.pipe.bind(annotatedSchema);

      private constructor() {
        throw new Error('Use create(Typename, { ...fields }) to instantiate an object.');
      }
    } as any;
  };
};
