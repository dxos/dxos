//
// Copyright 2025 DXOS.org
//

import type * as SchemaAST from 'effect/SchemaAST';

import { FormatEnum, ReferenceAnnotationId } from '@dxos/echo/internal';
import { findAnnotation } from '@dxos/effect';
import { type SchemaProperty } from '@dxos/schema';

import { findArrayElementType } from './schema';

type RefProps = {
  ast: SchemaAST.AST;
  isArray: boolean;
};

export const getRefProps = (property: SchemaProperty<any>): RefProps | undefined => {
  const { ast, format, array } = property;

  // Direct reference.
  if (format === FormatEnum.Ref) {
    return { ast, isArray: false };
  }

  // Array of references.
  if (array) {
    const elementType = findArrayElementType(ast);
    if (elementType) {
      const annotation = findAnnotation(elementType, ReferenceAnnotationId);
      if (annotation) {
        return { ast: elementType, isArray: true };
      }
    }
  }

  return undefined;
};
