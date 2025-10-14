//
// Copyright 2025 DXOS.org
//

import * as SchemaAST from 'effect/SchemaAST';

import { findNode } from '@dxos/effect';

export const findArrayElementType = (ast: SchemaAST.AST) => {
  const tupleType = findNode(ast, SchemaAST.isTupleType);
  const elementType = (tupleType as SchemaAST.TupleType | undefined)?.rest[0]?.type;

  return elementType;
};
