//
// Copyright 2025 DXOS.org
//

import type * as SchemaAST from 'effect/SchemaAST';

import { Format, ReferenceAnnotationId } from '@dxos/echo/internal';
import { findAnnotation, getArrayElementType, isArrayType } from '@dxos/effect';
import { type SchemaProperty } from '@dxos/schema';

type RefProps = {
  ast: SchemaAST.AST;
  isArray: boolean;
};

export const getRefProps = (property: SchemaProperty<any>): RefProps | undefined => {
  const { ast, format } = property;

  // Array of references.
  if (isArrayType(ast)) {
    const elementType = getArrayElementType(ast);
    if (elementType) {
      const annotation = findAnnotation(elementType, ReferenceAnnotationId);
      if (annotation) {
        return { ast: elementType, isArray: true };
      }
    }
  }

  // Direct reference.
  if (format === Format.TypeFormat.Ref) {
    return { ast, isArray: false };
  }

  return undefined;
};
