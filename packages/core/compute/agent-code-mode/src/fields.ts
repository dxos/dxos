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
 * An operation's input as the model is told about it, in the same labels as the types section, e.g.
 * `{ project: Ref<org.dxos.type.project> }`.
 *
 * Derived from the operation's own schema rather than the tool-calling projection, because that
 * projection rewrites refs to URI strings — a shape `Operation.invoke` rejects.
 */
export const describeInput = (schema: Schema.Top): string => {
  const ast = schema.ast;
  // The three spellings of "takes no input", as `createStructFieldsFromSchema` reads them.
  if (ast._tag === 'Void' || ast._tag === 'Null' || ast._tag === 'Unknown') {
    return 'none';
  }
  if (SchemaAST.isObjects(ast) && ast.propertySignatures.length === 0 && ast.indexSignatures.length === 0) {
    return '{}';
  }
  return labelOf(ast, 0);
};

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
    // A record or open struct (`Obj.Unknown`) has no closed field list to state.
    if (ast.propertySignatures.length === 0 || ast.indexSignatures.length > 0) {
      return 'object';
    }
    const fields = ast.propertySignatures.map(
      (property) =>
        `${String(property.name)}${SchemaAST.isOptional(property.type) ? '?' : ''}: ${labelOf(property.type, depth + 1)}`,
    );
    return `{ ${fields.join(', ')} }`;
  }
  if (SchemaAST.isSuspend(ast)) {
    return labelOf(ast.thunk(), depth + 1);
  }
  return 'unknown';
};
