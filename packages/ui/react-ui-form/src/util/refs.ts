//
// Copyright 2025 DXOS.org
//

import { Ref } from '@dxos/echo';
import * as Annotation from '@dxos/echo/Annotation';
import * as SchemaAST from '@dxos/effect/SchemaAST';
import * as SchemaEx from '@dxos/effect/SchemaEx';

type RefProps = {
  ast: SchemaAST.AST;
  isArray: boolean;
  typename?: string;
};

export const getRefProps = (ast: SchemaAST.AST): RefProps | undefined => {
  // Array of references.
  if (SchemaEx.isArrayType(ast)) {
    const elementType = SchemaEx.getArrayElementType(ast);
    if (elementType) {
      if (Ref.isRefType(elementType)) {
        const typename = SchemaEx.findAnnotation<Annotation.ReferenceAnnotationValue>(
          elementType,
          Annotation.ReferenceAnnotationId,
        )?.typename;
        return { ast: elementType, isArray: true, typename };
      }
    }
  }

  // Direct reference.
  if (Ref.isRefType(ast)) {
    const typename = SchemaEx.findAnnotation<Annotation.ReferenceAnnotationValue>(
      ast,
      Annotation.ReferenceAnnotationId,
    )?.typename;
    return { ast, isArray: false, typename };
  }

  return undefined;
};
