//
// Copyright 2024 DXOS.org
//

import type { SimplifyMutable, Struct } from '@effect/schema/Schema';
import * as S from '@effect/schema/Schema';

import { type EchoObjectAnnotation, EchoObjectAnnotationId } from './annotations';
import { schemaVariance } from './ast';
import { getSchema, getTypeReference } from './getter';

type TypedObjectOptions = {
  partial?: true;
  record?: true;
};

/**
 * Marker interface for typed objects (for type inference).
 */
export interface AbstractTypedObject<Fields> extends S.Schema<Fields> {
  // Type constructor.
  new (): Fields;
  // Fully qualified type name.
  readonly typename: string;
}

/**
 * Base class factory for typed objects.
 */
// TODO(burdon): Rename ObjectType.
export const TypedObject = <Klass>(args: EchoObjectAnnotation) => {
  return <
    Options extends TypedObjectOptions,
    SchemaFields extends Struct.Fields,
    SimplifiedFields = Options['partial'] extends boolean
      ? SimplifyMutable<Partial<Struct.Type<SchemaFields>>>
      : SimplifyMutable<Struct.Type<SchemaFields>>,
    Fields = SimplifiedFields & { id: string } & (Options['record'] extends boolean
        ? SimplifyMutable<S.IndexSignature.Type<S.IndexSignature.Records>>
        : {}),
  >(
    fields: SchemaFields,
    options?: Options,
  ): AbstractTypedObject<Fields> => {
    const fieldsSchema = options?.record ? S.Struct(fields, { key: S.String, value: S.Any }) : S.Struct(fields);
    const schemaWithModifiers = S.mutable(options?.partial ? S.partial(fieldsSchema) : fieldsSchema);
    const typeSchema = S.extend(schemaWithModifiers, S.Struct({ id: S.String }));
    const annotatedSchema = typeSchema.annotations({
      [EchoObjectAnnotationId]: { typename: args.typename, version: args.version },
    });

    return class {
      static readonly typename = args.typename;
      static [Symbol.hasInstance](obj: unknown): obj is Klass {
        return obj != null && getTypeReference(getSchema(obj))?.itemId === args.typename;
      }

      static readonly ast = annotatedSchema.ast;
      static readonly [S.TypeId] = schemaVariance;
      static readonly annotations = annotatedSchema.annotations.bind(annotatedSchema);
      static readonly pipe = annotatedSchema.pipe.bind(annotatedSchema);

      private constructor() {
        throw new Error('Use create(MyClass, fields) to instantiate an object.');
      }
    } as any;
  };
};
