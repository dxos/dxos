//
// Copyright 2024 DXOS.org
//

import { AST, type Schema as S } from '@effect/schema';
import { Option, pipe } from 'effect';

import { invariant } from '@dxos/invariant';

//
// Refs
// https://effect.website/docs/guides/schema
// https://www.npmjs.com/package/@effect/schema
// https://effect-ts.github.io/effect/schema/AST.ts.html
//

/**
 * Get annotation or return undefined.
 */
export const getAnnotation = <T>(annotationId: symbol, node: AST.Annotated): T | undefined =>
  pipe(AST.getAnnotation<T>(annotationId)(node), Option.getOrUndefined);

/**
 * Get type node.
 */
export const getType = (node: AST.AST): AST.AST | undefined => {
  if (AST.isUnion(node)) {
    return node.types.find((type) => getType(type));
  } else if (AST.isRefinement(node)) {
    return getType(node.from);
  } else {
    return node;
  }
};

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

export type Visitor = (node: AST.AST, path: string[]) => boolean | void;

export const isLeafNode: Visitor = (node: AST.AST) => !AST.isTupleType(node) && !AST.isTypeLiteral(node);

/**
 * Visit leaf nodes.
 * Refs:
 * - https://www.npmjs.com/package/unist-util-visit#visitor
 * - https://github.com/syntax-tree/unist-util-is?tab=readme-ov-file#test
 */
export const visit: {
  (node: AST.AST, visitor: Visitor): void;
  (node: AST.AST, test: Visitor, visitor: Visitor): void;
} = (node: AST.AST, testOrVisitor: Visitor, visitor?: Visitor): void => {
  if (!visitor) {
    visitNode(node, undefined, testOrVisitor);
  } else {
    visitNode(node, testOrVisitor, visitor);
  }
};

// TODO(burdon): Optional test (objects, arrays, etc.)
const visitNode = (node: AST.AST, test: Visitor | undefined, visitor: Visitor, path: string[] = []): void => {
  for (const prop of AST.getPropertySignatures(node)) {
    const currentPath = [...path, prop.name.toString()];
    const type = getType(prop.type);
    if (type) {
      // NOTE: Only visits leaf nodes.
      if (AST.isTypeLiteral(type)) {
        // const ok = visitor(type, currentPath);
        // if (ok !== false) {
        visitNode(type, test, visitor, currentPath);
        // }
      } else {
        const ok = visitor(type, currentPath);
        if (ok === false) {
          return;
        }
      }
    }
  }
};
