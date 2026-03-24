//
// Copyright 2025 DXOS.org
//

import type * as SchemaAST from 'effect/SchemaAST';

import { Ref } from '@dxos/echo';
import { type ReferenceAnnotationValue, ReferenceAnnotationId } from '@dxos/echo/internal';
import { findAnnotation, getArrayElementType, isArrayType } from '@dxos/effect';

type RefProps = {
  ast: SchemaAST.AST;
  isArray: boolean;
  typename?: string;
};

export const getRefProps = (ast: SchemaAST.AST): RefProps | undefined => {
  // Array of references.
  if (isArrayType(ast)) {
    const elementType = getArrayElementType(ast);
    if (elementType) {
      if (Ref.isRefType(elementType)) {
        const typename = findAnnotation<ReferenceAnnotationValue>(elementType, ReferenceAnnotationId)?.typename;
        return { ast: elementType, isArray: true, typename };
      }
    }
  }

  // Direct reference.
  if (Ref.isRefType(ast)) {
    const typename = findAnnotation<ReferenceAnnotationValue>(ast, ReferenceAnnotationId)?.typename;
    return { ast, isArray: false, typename };
  }

  return undefined;
};
