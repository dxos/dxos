//
// Copyright 2024 DXOS.org
//

import * as AST from '@effect/schema/AST';
import * as S from '@effect/schema/Schema';
import type { SimplifyMutable, Struct } from '@effect/schema/Schema';

import { type EchoObjectAnnotation, EchoObjectAnnotationId, getEchoObjectAnnotation } from './reactive';

type EchoClassOptions = {
  partial?: true;
};

export interface EchoObjectClassType<T> {
  new (name: Omit<T, 'id'>): T;
}

export interface EchoSchemaClass<Self, Fields> extends S.Schema<Fields> {
  new (): Fields;

  typename(): string;

  isInstance(obj: unknown): obj is Self;
}

export const EchoObjectSchema = <Klass>(args: EchoObjectAnnotation) => {
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
  ): EchoSchemaClass<Klass, Fields> => {
    const fieldsSchema = S.mutable(options?.partial ? S.partial(S.struct(fields)) : S.struct(fields));
    const typeSchema = S.extend(fieldsSchema, S.struct({ id: S.string }));
    const annotatedSchema = S.make(
      AST.annotations(typeSchema.ast, {
        [EchoObjectAnnotationId]: {
          typename: args.typename,
          version: args.version,
        },
      }),
    );
    const klass: any = class {
      constructor() {
        throw new Error('use E.object(MyClass, fields) to instantiate an object');
      }
    };
    klass.ast = annotatedSchema.ast;
    klass[S.TypeId] = {
      _A: (_: any) => _,
      _I: (_: any) => _,
      _R: (_: never) => _,
    };
    return klass;
  };
};

export const getEchoObjectSubclassTypename = (klass: any): string | undefined => {
  const ast = (klass as any).ast;
  if (!AST.isTransform(ast)) {
    return undefined;
  }
  return getEchoObjectAnnotation(S.make(ast.to))?.typename;
};
