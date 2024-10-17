//
// Copyright 2024 DXOS.org
//

import { AST, type S } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

// TODO(burdon): Move to @dxos/effect (in common with echo-schema).

export const getType = (node: AST.AST): AST.AST | undefined => {
  if (AST.isUnion(node)) {
    return node.types.find((type) => getType(type));
  } else if (AST.isRefinement(node)) {
    // TODO(burdon): Document refinements.
    return getType(node.from);
  } else {
    return node;
  }
};

export const isType = (node: AST.AST): boolean => isScalar(node) || AST.isTypeLiteral(node);

// TODO(burdon): Other primitive types? Any, BigInt, Arrays, etc.
export const isScalar = (node: AST.AST) =>
  AST.isNumberKeyword(node) || AST.isBooleanKeyword(node) || AST.isStringKeyword(node);

/**
 * Get the AST node for the given property (dot-path).
 */
export const getProperty = (schema: S.Schema<any>, path: string): AST.AST | undefined => {
  let node: AST.AST = schema.ast;
  for (const part of path.split('.')) {
    const props = AST.getPropertySignatures(node);
    const prop = props.find((prop) => prop.name === part);
    if (!prop) {
      return undefined;
    }

    // TODO(burdon): Check if leaf.
    const type = getType(prop.type);
    invariant(type, `invalid type: ${path}`);
    node = type;
  }

  return node;
};

export type Visitor = (node: AST.AST, path: string[]) => void;

/**
 * Visit leaf nodes.
 * Ref: https://www.npmjs.com/package/unist-util-visit#visitor
 */
export const visitNode = (node: AST.AST, visitor: Visitor) => visit(node, visitor);

const visit = (node: AST.AST, visitor: Visitor, path: string[] = []) => {
  const props = AST.getPropertySignatures(node);
  props.forEach((prop) => {
    const propPath = [...path, prop.name.toString()];
    const type = getType(prop.type);
    if (type) {
      if (AST.isTypeLiteral(type)) {
        visit(type, visitor, propPath);
      } else {
        // NOTE: Only visits leaf nodes.
        visitor(type, propPath);
      }
    }
  });
};
