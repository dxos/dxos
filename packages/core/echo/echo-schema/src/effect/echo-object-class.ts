//
// Copyright 2024 DXOS.org
//

import * as AST from '@effect/schema/AST';
import * as S from '@effect/schema/Schema';
import type { Class, SimplifyMutable, Struct } from '@effect/schema/Schema';
import { pipe } from 'effect';
import * as Option from 'effect/Option';

import { type EchoObjectAnnotation, EchoObjectAnnotationId, getEchoObjectAnnotation } from './reactive';

const EchoClassOptionsAnnotationId = Symbol.for('@dxos/echo-class/annotation/Options');
type EchoClassOptionsAnnotation = {
  partial?: true;
};
const getEchoClassOptionsAnnotation = (schema: S.Schema<any>) =>
  pipe(
    AST.getAnnotation<EchoClassOptionsAnnotation>(EchoClassOptionsAnnotationId)(schema.ast),
    Option.getOrElse(() => ({}) as EchoClassOptionsAnnotation),
  );

export type EchoObjectClassType<T> = new (props: Omit<T, 'id'>) => T;

export const EchoObject = <Klass>(args: EchoObjectAnnotation) => {
  return <
    Options extends EchoClassOptionsAnnotation,
    SchemaFields extends Struct.Fields,
    SimplifiedFields = Options['partial'] extends boolean
      ? SimplifyMutable<Partial<Struct.Type<SchemaFields>>>
      : SimplifyMutable<Struct.Type<SchemaFields>>,
    Fields = SimplifiedFields & { id: string },
  >(
    fields: SchemaFields,
    options?: Options,
  ): Class<Klass, SchemaFields & { id: S.$string }, Fields, Fields, Fields, SimplifiedFields, {}, {}> => {
    return S.Class<Klass>(args.typename)(fields, {
      [EchoObjectAnnotationId]: { typename: args.typename, version: args.version },
      [EchoClassOptionsAnnotationId]: { partial: options?.partial },
    }) as any;
  };
};

export const getEchoObjectSubclassSchema = (klass: any): S.Schema<any> => {
  const ast = klass.ast;
  if (AST.isTransform(ast)) {
    const transformSchema = S.make(ast.to);
    const typeAnnotation = getEchoObjectAnnotation(transformSchema);
    if (typeAnnotation != null) {
      const classOptions = getEchoClassOptionsAnnotation(transformSchema);
      const typeSchema = classOptions.partial ? S.partial(S.make(ast.from)) : S.make(ast.from);
      const schemaWithId = S.extend(S.mutable(typeSchema), S.struct({ id: S.string }));
      return S.make(AST.annotations(schemaWithId.ast, { [EchoObjectAnnotationId]: typeAnnotation }));
    }
  }
  throw new Error('only types created using `class Type extends EchoObject<Type>(...)` are allowed');
};
