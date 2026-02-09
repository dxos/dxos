//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import type * as SchemaAST from 'effect/SchemaAST';

import { Annotation } from '@dxos/echo';
import { type SchemaProperty, getProperties } from '@dxos/effect';

/**
 * Get the property types of an AST and filter out properties that are not form inputs.
 */
export const getFormProperties = (ast: SchemaAST.AST): SchemaProperty[] => {
  return getProperties(ast).filter((prop) =>
    Annotation.FormInputAnnotation.getFromAst(prop.type).pipe(Option.getOrElse(() => true)),
  );
};
