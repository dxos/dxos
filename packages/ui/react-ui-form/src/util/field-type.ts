//
// Copyright 2025 DXOS.org
//

import * as SchemaAST from 'effect/SchemaAST';

import { getAnnotation, isLiteralUnion } from '@dxos/effect';

/**
 * Detected field type for a schema property.
 */
export type SettingsFieldType = 'boolean' | 'string' | 'number' | 'select';

export type SelectOption = {
  value: string | number;
  label?: string;
};

/**
 * Detect the field type from an Effect Schema AST node.
 */
export const detectFieldType = (ast: SchemaAST.AST): SettingsFieldType | undefined => {
  if (isLiteralUnion(ast)) {
    return 'select';
  }

  switch (ast._tag) {
    case 'BooleanKeyword':
      return 'boolean';
    case 'StringKeyword':
      return 'string';
    case 'NumberKeyword':
      return 'number';
  }

  return undefined;
};

/**
 * Extract select options from a literal union AST node.
 * Reads title annotations from individual literals for labels.
 */
export const getSelectOptionsFromAst = (ast: SchemaAST.AST): SelectOption[] | undefined => {
  if (!isLiteralUnion(ast)) {
    return undefined;
  }

  return (ast as SchemaAST.Union<SchemaAST.Literal>).types.flatMap((literalNode) => {
    const value = literalNode.literal;
    if (typeof value !== 'string' && typeof value !== 'number') {
      return [];
    }
    const title = getAnnotation<string>(SchemaAST.TitleAnnotationId, false)(literalNode);
    const label = title ?? (typeof value === 'string' ? value.charAt(0).toUpperCase() + value.slice(1) : String(value));
    return [{ value, label }];
  });
};
