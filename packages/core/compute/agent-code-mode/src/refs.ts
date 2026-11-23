//
// Copyright 2026 DXOS.org
//

import * as SchemaAST from 'effect/SchemaAST';

import { Obj, Ref, URI } from '@dxos/echo';
import { EID, EntityId } from '@dxos/keys';

const MAX_DEPTH = 8;

/** Whether a value at this node may be a reference: the node is one, or a union (an optional or nullable field) with one. */
const takesRef = (ast: SchemaAST.AST): boolean =>
  Ref.isRefType(ast) || (SchemaAST.isUnion(ast) && ast.types.some((type) => Ref.isRefType(type)));

/** An object's legacy ECHO DXN, `dxn:echo:<space>:<id>`, `@` or nothing for this space. */
const LEGACY_ECHO_DXN = /^dxn:echo:(?:([A-Z0-9]+|@):)?([0-9A-Z]{26})$/;

/**
 * The URI of the object a string names, in the forms models write: its URI (`echo://…`, as the agent's context names
 * the agent), its bare id (`obj.id`, as a printed object shows it), a URI missing the slash of this space
 * (`echo://<id>`), a URI behind a `dxn:` it does not take, or a legacy ECHO DXN. Undefined for anything else.
 */
export const toObjectURI = (text: string): string | undefined => {
  const bare = text.startsWith('dxn:echo://') ? text.slice('dxn:'.length) : text;
  // Before the EID check, which reads `echo://<id>` as a URI whose space is the id.
  const id = /^echo:\/\/([0-9A-Z]{26})$/.exec(bare)?.[1] ?? (EntityId.isValid(bare) ? bare : undefined);
  if (id !== undefined) {
    return `echo:///${id}`;
  }
  if (EID.tryParse(bare) !== undefined) {
    return bare;
  }
  const match = LEGACY_ECHO_DXN.exec(bare);
  if (!match) {
    return undefined;
  }
  const [, space, legacyId] = match;
  return space === undefined || space === '@' ? `echo:///${legacyId}` : `echo://${space}/${legacyId}`;
};

/**
 * The input with every object that sits where its schema expects a reference replaced by a reference to
 * it. Code holds objects, and passing one for a `Ref<…>` field is the call agents get wrong first; the
 * object names its target exactly, so the reference is the one the caller meant. A string that names an
 * object ({@link toObjectURI}) names it as exactly, so it is taken too.
 */
export const toRefs = (ast: SchemaAST.AST, value: unknown, depth = 0): unknown => {
  const uri = typeof value === 'string' && takesRef(ast) ? toObjectURI(value) : undefined;
  if (uri !== undefined) {
    return Ref.fromURI(URI.make(uri));
  }
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
