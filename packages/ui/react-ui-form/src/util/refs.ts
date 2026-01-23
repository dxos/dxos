//
// Copyright 2025 DXOS.org
//

import type * as SchemaAST from 'effect/SchemaAST';

import { Ref } from '@dxos/echo';
import { getArrayElementType, isArrayType } from '@dxos/effect';

type RefProps = {
  ast: SchemaAST.AST;
  isArray: boolean;
};

export const getRefProps = (ast: SchemaAST.AST): RefProps | undefined => {
  // Array of references.
  if (isArrayType(ast)) {
    const elementType = getArrayElementType(ast);
    if (elementType) {
      if (Ref.isRefType(elementType)) {
        return { ast: elementType, isArray: true };
      }
    }
  }

  // Direct reference.
  if (Ref.isRefType(ast)) {
    return { ast, isArray: false };
  }

  return undefined;
};
