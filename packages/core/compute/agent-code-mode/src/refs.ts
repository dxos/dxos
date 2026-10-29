//
// Copyright 2026 DXOS.org
//

import * as SchemaAST from 'effect/SchemaAST';

import { Obj, Ref } from '@dxos/echo';

const MAX_DEPTH = 8;

/** Whether a value at this node may be a reference: the node is one, or a union (an optional or nullable field) with one. */
const takesRef = (ast: SchemaAST.AST): boolean =>
  Ref.isRefType(ast) || (SchemaAST.isUnion(ast) && ast.types.some((type) => Ref.isRefType(type)));

/**
 * The input with every object that sits where its schema expects a reference replaced by a reference to
 * it. Code holds objects, and passing one for a `Ref<...>` field is the call agents get wrong first; the
 * object names its target exactly, so the reference is the one the caller meant.
 */
export const toRefs = (ast: SchemaAST.AST, value: unknown, depth = 0): unknown => {
  if (depth > MAX_DEPTH || value === null || typeof value !== 'object') {
    return value;
  }
  if (Obj.isObject(value)) {
    return takesRef(ast) ? Ref.make(value) : value;
  }
  if (SchemaAST.isSuspend(ast)) {
    return toRefs(ast.thunk(), value, depth + 1);
  }
  if (SchemaAST.isUnion(ast)) {
    const [member, ...rest] = ast.types.filter((type) => !SchemaAST.isUndefined(type) && !SchemaAST.isNull(type));
    return member !== undefined && rest.length === 0 ? toRefs(member, value, depth + 1) : value;
  }
  if (Array.isArray(value) && SchemaAST.isArrays(ast)) {
    const item = ast.rest[0] ?? ast.elements[0];
    return item === undefined ? value : value.map((entry) => toRefs(item, entry, depth + 1));
  }
  if (!Array.isArray(value) && SchemaAST.isObjects(ast) && ast.propertySignatures.length > 0 && !Ref.isRef(value)) {
    const record: Record<string, unknown> = { ...value };
    for (const property of ast.propertySignatures) {
      const key = String(property.name);
      if (key in record) {
        record[key] = toRefs(property.type, record[key], depth + 1);
      }
    }
    return record;
  }
  return value;
};
