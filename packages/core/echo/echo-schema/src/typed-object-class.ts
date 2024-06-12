//
// Copyright 2024 DXOS.org
//

import type { SimplifyMutable, Struct } from '@effect/schema/Schema';
import * as S from '@effect/schema/Schema';

import { type EchoObjectAnnotation, EchoObjectAnnotationId } from './annotations';
import { schemaVariance } from './ast';
import { getSchema, getTypeReference } from './getter';
import { DXN } from '@dxos/keys';

type EchoClassOptions = {
  partial?: true;
};

export interface EchoSchemaClass<Fields> extends S.Schema<Fields> {
  new (): Fields;
  readonly typename: string;
}

// TODO(burdon): Not a good name for schema.
export const TypedObject = <Klass>(args: EchoObjectAnnotation) => {
  return <
    Options extends EchoClassOptions,
    SchemaFields extends Struct.Fields,
    SimplifiedFields = Options['partial'] extends boolean
      ? SimplifyMutable<Partial<Struct.Type<SchemaFields>>>
      : SimplifyMutable<Struct.Type<SchemaFields>>,
    Fields = SimplifiedFields & { id: string },
  >(
    fields: SchemaFields,
    options?: Options,
  ): EchoSchemaClass<Fields> => {
    const fieldsSchema = S.mutable(options?.partial ? S.partial(S.Struct(fields)) : S.Struct(fields));
    const typeSchema = S.extend(fieldsSchema, S.Struct({ id: S.String }));
    const annotatedSchema = typeSchema.annotations({
      [EchoObjectAnnotationId]: { typename: args.typename, version: args.version },
    });

    return class {
      static readonly typename = args.typename;
      static [Symbol.hasInstance](obj: unknown): obj is Klass {
        const typeDxn = obj != null && getTypeReference(getSchema(obj))?.dxn;
        return !!typeDxn && typeDxn.isTypeDXNOf(this.typename);
      }

      static readonly ast = annotatedSchema.ast;
      static readonly [S.TypeId] = schemaVariance;
      static readonly annotations = annotatedSchema.annotations.bind(annotatedSchema);
      static readonly pipe = annotatedSchema.pipe.bind(annotatedSchema);

      private constructor() {
        throw new Error('use create(MyClass, fields) to instantiate an object');
      }
    } as any;
  };
};
