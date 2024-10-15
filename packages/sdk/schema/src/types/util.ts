//
// Copyright 2024 DXOS.org
//

import { AST } from '@dxos/echo-schema';

export const isScalar = (ast: AST.AST) =>
  AST.isNumberKeyword(ast) || AST.isBooleanKeyword(ast) || AST.isStringKeyword(ast);

export const isStruct = (node: AST.AST) => AST.isTypeLiteral(node);
