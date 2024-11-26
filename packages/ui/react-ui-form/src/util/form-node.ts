//
// Copyright 2024 DXOS.org
//

import { AST, type BaseObject } from '@dxos/echo-schema';
import { getDiscriminatingProps, getSimpleType, isDiscriminatedUnion, isLiteralUnion } from '@dxos/effect';
import { invariant } from '@dxos/invariant';

// TODO(ZaymonFC): This can be multiple fields, although I'm in favour of an invariant
// that enforces a single union discriminator field.
type DiscriminatorValue = string | number | boolean;

type FieldMeta = {
  options?: DiscriminatorValue[];
};

export type FormNode =
  | { type: 'input'; key?: string; valueType: string; meta: FieldMeta }
  | { type: 'record'; key?: string; members: FormNode[] }
  | { type: 'list'; key?: string; element: FormNode }
  | { type: 'tuple'; key?: string; elements: FormNode[] }
  | { type: 'choice'; key?: string; discriminatingKey: string; options: Map<DiscriminatorValue, FormNode> };
//
// Transformation.
//

const getValueType = (node: AST.AST): { type: string; meta: FieldMeta } => {
  if (isLiteralUnion(node)) {
    const union = node as AST.Union;
    return {
      type: 'literal',
      meta: {
        options: union.types
          .map((type) => (AST.isLiteral(type) ? (type.literal as DiscriminatorValue) : undefined))
          .filter((x): x is DiscriminatorValue => x !== undefined),
      },
    };
  }

  const type = getSimpleType(node);
  invariant(type, 'Unable to determine value type');
  return { type, meta: {} };
};

/**
 * Converts an Effect Schema AST into a FormNode tree.
 */
export const createFormTree = <T extends BaseObject>(ast: AST.AST, value?: T): FormNode => {
  // Handle discriminated unions.
  if (isDiscriminatedUnion(ast)) {
    const options = new Map<DiscriminatorValue, FormNode>();
    const discriminators = getDiscriminatingProps(ast);
    invariant(discriminators?.length === 1, 'Expected exactly one discriminator');
    const discriminatingKey = discriminators[0];

    const union = ast as AST.Union;
    for (const type of union.types) {
      const literalProp = AST.getPropertySignatures(type).find(
        (p) => p.name === discriminatingKey && AST.isLiteral(p.type),
      );

      if (literalProp && AST.isLiteral(literalProp.type)) {
        options.set(literalProp.type.literal as DiscriminatorValue, createFormTree(type));
      }
    }

    return {
      type: 'choice',
      discriminatingKey,
      options,
    };
  }
  // Handle object types.
  if (AST.isTypeLiteral(ast)) {
    return {
      type: 'record',
      members: AST.getPropertySignatures(ast).map((prop) => ({
        ...createFormTree(prop.type),
        key: prop.name.toString(),
      })),
    };
  }

  // Handle array/tuple types.
  if (AST.isTupleType(ast)) {
    const [tupleType] = ast.rest ?? [];
    if (tupleType) {
      return {
        type: 'list',
        element: createFormTree(tupleType.type),
      };
    }

    return {
      type: 'tuple',
      elements: ast.elements.map((el) => createFormTree(el.type)),
    };
  }

  // Handle leaf nodes (primitive types).
  const { type: valueType, meta } = getValueType(ast);
  return {
    type: 'input',
    valueType,
    meta,
  };
};
