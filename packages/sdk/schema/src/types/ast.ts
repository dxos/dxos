//
// Copyright 2024 DXOS.org
//

import { AST, type S } from '@dxos/echo-schema';

/**
 * Get the AST node for the given property (dot-path).
 */
export const getProperty = (schema: S.Schema<any>, path: string): AST.AST | undefined => {
  let node: AST.AST = schema.ast;
  const parts = path.split('.');
  for (const part of parts) {
    const props = AST.getPropertySignatures(node);
    const prop = props.find((prop) => prop.name === part);
    if (!prop) {
      return undefined;
    }

    // TODO(burdon): Check if leaf path.
    if (AST.isUnion(prop.type)) {
      const n = prop.type.types.find(
        (p) => AST.isTypeLiteral(p) || AST.isNumberKeyword(p) || AST.isBooleanKeyword(p) || AST.isStringKeyword(p),
      );
      if (!n) {
        return undefined;
      }
      node = n;
    } else {
      node = prop.type;
    }
  }

  return node;
};
