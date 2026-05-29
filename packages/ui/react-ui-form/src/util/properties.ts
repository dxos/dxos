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
 *
 * For optional fields, `prop.type` is the union `T | undefined` — the annotation
 * lives on the inner `T`. Unwrap before reading so that the conventional pattern
 * `Schema.String.pipe(FormInputAnnotation.set(false), Schema.optional)` works.
 */
export const getFormProperties = (ast: SchemaAST.AST): SchemaProperty[] => {
  const hidden = new Set(
    SchemaAST.getPropertySignatures(ast)
      .filter((prop) => {
        // Unwrap `T | undefined` for optional fields so the inner annotation is visible.
        const type =
          prop.isOptional && SchemaAST.isUnion(prop.type)
            ? (prop.type.types.find((t) => t._tag !== 'UndefinedKeyword') ?? prop.type)
            : prop.type;
        return Annotation.FormInputAnnotation.getFromAst(type).pipe(Option.getOrElse(() => true)) === false;
      })
      .map((prop) => prop.name),
  );
  return getProperties(ast).filter((prop) => !hidden.has(prop.name));
};
