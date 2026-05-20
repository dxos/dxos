//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import * as SchemaAST from 'effect/SchemaAST';

import { Annotation } from '@dxos/echo';
import { type SchemaProperty, getProperties } from '@dxos/effect';

/**
 * Get the property types of an AST and filter out properties that are not form inputs.
 *
 * The `FormInputAnnotation` is read from the raw property signature's AST (before
 * `encodedBoundAST` is applied by `getProperties`), because `encodedBoundAST` strips
 * annotations from non-keyword inner types (e.g., `Schema.Struct`, `Schema.Array`).
 * Without this, fields like `Routine.input` (a JsonSchema struct) annotated
 * `FormInputAnnotation.set(false)` would still render in the form.
 */
export const getFormProperties = (ast: SchemaAST.AST): SchemaProperty[] => {
  const hidden = new Set(
    SchemaAST.getPropertySignatures(ast)
      .filter(
        (prop) => Annotation.FormInputAnnotation.getFromAst(prop.type).pipe(Option.getOrElse(() => true)) === false,
      )
      .map((prop) => prop.name),
  );
  return getProperties(ast).filter((prop) => !hidden.has(prop.name));
};
