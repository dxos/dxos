//
// Copyright 2026 DXOS.org
//

import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { Ref } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import type { SandboxField } from './Dialect.ts';

/** How deep a label follows arrays and recursive schemas before settling for `object`. */
const MAX_DEPTH = 3;

/**
 * The fields of a type's schema as the model is told about them: name, a TypeScript-like type
 * label, and whether the field may be omitted.
 */
export const describeFields = (fields: Schema.Struct.Fields): SandboxField[] =>
  Object.entries(fields).map(([name, field]) => ({
    name,
    type: labelOf(field.ast, 0),
    optional: SchemaAST.isOptional(field.ast),
  }));

/**
 * A short, TypeScript-like label for a schema node.
 *
 * A reference is checked first: it is a declaration whose encoded side is a struct, so read
 * structurally it would claim to be a plain object — which is exactly the mistake that sends a
 * model looking for the reference format by trial and error.
 */
export const labelOf = (ast: SchemaAST.AST, depth: number): string => {
  const target = Ref.getReferenceTarget(ast);
  if (target !== undefined) {
    return `Ref<${DXN.isDXN(target) ? DXN.getName(target) : String(target)}>`;
  }
  if (depth > MAX_DEPTH) {
    return 'object';
  }
  if (SchemaAST.isString(ast) || SchemaAST.isTemplateLiteral(ast)) {
    return 'string';
  }
  if (SchemaAST.isNumber(ast)) {
    return 'number';
  }
  if (SchemaAST.isBoolean(ast)) {
    return 'boolean';
  }
  if (SchemaAST.isBigInt(ast)) {
    return 'bigint';
  }
  if (SchemaAST.isLiteral(ast)) {
    return JSON.stringify(ast.literal);
  }
  if (SchemaAST.isUnion(ast)) {
    // The `undefined` member is how an optional field is spelled; optionality is reported separately.
    const members = ast.types.filter((type) => !SchemaAST.isUndefined(type)).map((type) => labelOf(type, depth));
    return [...new Set(members)].join(' | ') || 'undefined';
  }
  if (SchemaAST.isArrays(ast)) {
    const item = ast.rest[0] ?? ast.elements[0];
    if (item === undefined) {
      return 'unknown[]';
    }
    const label = labelOf(item, depth + 1);
    return label.includes(' | ') ? `(${label})[]` : `${label}[]`;
  }
  if (SchemaAST.isObjects(ast)) {
    return 'object';
  }
  if (SchemaAST.isSuspend(ast)) {
    return labelOf(ast.thunk(), depth + 1);
  }
  return 'unknown';
};
