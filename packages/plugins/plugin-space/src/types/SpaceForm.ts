//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import * as SchemaAST from 'effect/SchemaAST';

import * as TypeOptions from '@dxos/app-toolkit/TypeOptions';
import * as SchemaEx from '@dxos/effect/SchemaEx';

export type TypeInputOptions = TypeOptions.TypeInputOptions;
export const TypeInputOptionsAnnotation = TypeOptions.TypeInputOptionsAnnotation;
export const TypeInputOptionsAnnotationId = TypeOptions.TypeInputOptionsAnnotationId;

/**
 * The type-picker options a form field declares. Read through the annotation, which stores its value in
 * the field's property meta, and through `Schema.optional`, whose `T | undefined` union carries it on `T`.
 */
export const getTypeInputOptions = (ast: SchemaAST.AST): Option.Option<TypeInputOptions> => {
  const own = TypeInputOptionsAnnotation.getFromAst(ast);
  return Option.isNone(own) && SchemaAST.isUnion(ast) && SchemaEx.isOption(ast)
    ? TypeInputOptionsAnnotation.getFromAst(ast.types[0])
    : own;
};
