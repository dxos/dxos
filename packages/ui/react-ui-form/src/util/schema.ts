//
// Copyright 2025 DXOS.org
//

import { SchemaAST } from 'effect';

import { findNode } from '@dxos/effect';

export const findArrayElementType = (ast: SchemaAST.AST) => {
  const tupleType = findNode(ast, SchemaAST.isTupleType);
  return (tupleType as SchemaAST.TupleType | undefined)?.rest[0]?.type;
};
