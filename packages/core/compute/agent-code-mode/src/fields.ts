//
// Copyright 2026 DXOS.org
//

import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { Ref, type Registry, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import type { SandboxField, SandboxType } from './Dialect.ts';

/**
 * Every object and relation type the database's registry holds, with its fields: what the model is
 * told it may resolve. Read from the registry the code will run against, so a sandbox that could not
 * rebuild a type does not list it.
 */
export const describeTypes = (registry: Registry.Registry): SandboxType[] => {
  const types = registry
    .list()
    .filter((entity) => Type.isType(entity) && (Type.isObject(entity) || Type.isRelation(entity)))
    .flatMap((type) => {
      const typename = Type.getTypename(type) ?? '';
      return typename.length > 0 ? [{ type, typename, version: Type.getVersion(type) }] : [];
    });

  // The first entry at the highest version of each typename; a registry can hold one DXN twice.
  const newest = new Map<string, (typeof types)[number]>();
  for (const entry of types) {
    const current = newest.get(entry.typename);
    if (current === undefined || compareVersions(entry.version, current.version) > 0) {
      newest.set(entry.typename, entry);
    }
  }

  return types.map((entry) => ({
    typename: entry.typename,
    dxn: String(DXN.make(entry.typename, entry.version)),
    kind: Type.isRelation(entry.type) ? ('relation' as const) : ('object' as const),
    latest: newest.get(entry.typename) === entry,
    // The same `fields` record the bound type carries, which is what the model would otherwise go
    // looking for.
    fields: describeFields(('fields' in entry.type && entry.type.fields) || {}),
  }));
};

/** Orders two `major.minor.patch` versions, ignoring any pre-release suffix. */
const compareVersions = (a: string, b: string): number => {
  const parse = (version: string) => version.split('-')[0].split('.').map(Number);
  const [left, right] = [parse(a), parse(b)];
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    const delta = (left[index] ?? 0) - (right[index] ?? 0);
    if (delta !== 0) {
      return delta;
    }
  }
  return 0;
};

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
    summary: labelOf(field.ast, 0, true),
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
 *
 * A struct, or a union of them, carrying an `identifier` annotation (a JSON Schema, a query AST) is
 * labelled by that name rather than expanded. `collapse` labels every other struct `object`.
 */
export const labelOf = (ast: SchemaAST.AST, depth: number, collapse = false): string => {
  const target = Ref.getReferenceTarget(ast);
  if (target !== undefined) {
    return `Ref<${DXN.isDXN(target) ? DXN.getName(target) : String(target)}>`;
  }
  // Only where a struct would be expanded: a named enum still lists its literals.
  const identifier =
    SchemaAST.isObjects(ast) || (SchemaAST.isUnion(ast) && ast.types.some(SchemaAST.isObjects))
      ? SchemaAST.resolveIdentifier(ast)
      : undefined;
  if (identifier !== undefined) {
    return identifier;
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
    const members = ast.types
      .filter((type) => !SchemaAST.isUndefined(type))
      .map((type) => labelOf(type, depth, collapse));
    return [...new Set(members)].join(' | ') || 'undefined';
  }
  if (SchemaAST.isArrays(ast)) {
    const item = ast.rest[0] ?? ast.elements[0];
    if (item === undefined) {
      return 'unknown[]';
    }
    const label = labelOf(item, depth + 1, collapse);
    return label.includes(' | ') ? `(${label})[]` : `${label}[]`;
  }
  if (SchemaAST.isObjects(ast)) {
    // A record or open struct (`Obj.Unknown`) has no closed field list to state; a collapsed one states none.
    if (collapse || ast.propertySignatures.length === 0 || ast.indexSignatures.length > 0) {
      return 'object';
    }
    const fields = ast.propertySignatures.map(
      (property) =>
        `${String(property.name)}${SchemaAST.isOptional(property.type) ? '?' : ''}: ${labelOf(property.type, depth + 1)}`,
    );
    return `{ ${fields.join(', ')} }`;
  }
  if (SchemaAST.isSuspend(ast)) {
    return labelOf(ast.thunk(), depth + 1, collapse);
  }
  return 'unknown';
};
