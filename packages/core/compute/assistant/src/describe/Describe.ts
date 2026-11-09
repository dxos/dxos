//
// Copyright 2026 DXOS.org
//

import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { type Database, Ref, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

/**
 * How a model is told about types and operation inputs: TypeScript-like labels read from the schemas themselves, shared
 * by code mode's prompt and by the Skill Manager's lookups.
 */

/** One field of a registered type, as the model is told about it. */
export type FieldDescription = {
  readonly name: string;
  /** TypeScript-like label, e.g. `string`, `"open" | "done"`, `Ref<org.dxos.type.text>`. */
  readonly type: string;
  readonly optional: boolean;
};

/** A type the workspace has registered, as the model is told about it. */
export type TypeDescription = {
  readonly typename: string;
  /** The versioned DXN `Database.resolve` resolves the type by. */
  readonly dxn: string;
  /** A relation is an edge between two objects, made with `Relation.make` rather than `Obj.make`. */
  readonly kind: 'object' | 'relation';
  /**
   * Fields with their types, so the model never has to introspect a schema to find out what it may
   * write — least of all that a field holds a reference, which a name alone does not say.
   */
  readonly fields: readonly FieldDescription[];
};

/**
 * Every object and relation type the database's registry holds, with its fields: what the model is
 * told it may resolve. Read from the registry the code will run against, so a sandbox that could not
 * rebuild a type does not list it.
 */
export const describeTypes = (db: Database.Database, options: DescribeOptions = {}): TypeDescription[] =>
  db.registry
    .list()
    .filter((entity) => Type.isType(entity) && (Type.isObject(entity) || Type.isRelation(entity)))
    .flatMap((type) => {
      const typename = Type.getTypename(type) ?? '';
      return typename.length > 0
        ? [
            {
              typename,
              dxn: String(DXN.make(typename, Type.getVersion(type))),
              kind: Type.isRelation(type) ? ('relation' as const) : ('object' as const),
              // The same `fields` record the bound type carries, which is what the model would
              // otherwise go looking for.
              fields: describeFields(('fields' in type && type.fields) || {}, options),
            },
          ]
        : [];
    });

export type DescribeOptions = {
  /**
   * Name a union of many tagged variants by its tags alone (see {@link ABRIDGED_UNION}): right for a list of every
   * type, wrong for a lookup of one, which is how a model finds a variant's fields.
   * @default true
   */
  readonly abridge?: boolean;
};

/** How deep a label follows arrays and recursive schemas before settling for `object`. */
const MAX_DEPTH = 3;

/**
 * Past this many tagged variants a union is named by its tags alone: a content-block union spelled out in full is
 * most of a prompt (14k characters for one type) and says nothing a model needs to choose a call.
 */
const MAX_TAGGED_VARIANTS = 4;

/** How a union named by its tags ends, so a reader of the label can tell its variants' fields were left out. */
export const ABRIDGED_UNION = ', … }';

/**
 * The fields of a type's schema as the model is told about them: name, a TypeScript-like type
 * label, and whether the field may be omitted.
 */
export const describeFields = (
  fields: Schema.Struct.Fields,
  { abridge = true }: DescribeOptions = {},
): FieldDescription[] =>
  Object.entries(fields).map(([name, field]) => ({
    name,
    type: labelOf(field.ast, 0, abridge),
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

/** The `_tag` literal of a tagged struct, if it is one. */
const tagOf = (ast: SchemaAST.AST): string | undefined => {
  if (SchemaAST.isSuspend(ast)) {
    return tagOf(ast.thunk());
  }
  if (!SchemaAST.isObjects(ast)) {
    return undefined;
  }
  const tag = ast.propertySignatures.find((property) => property.name === '_tag')?.type;
  return tag !== undefined && SchemaAST.isLiteral(tag) && typeof tag.literal === 'string' ? tag.literal : undefined;
};

/**
 * A short, TypeScript-like label for a schema node.
 *
 * A reference is checked first: it is a declaration whose encoded side is a struct, so read
 * structurally it would claim to be a plain object — which is exactly the mistake that sends a
 * model looking for the reference format by trial and error.
 *
 * With `abridge`, a union of more than {@link MAX_TAGGED_VARIANTS} tagged variants is named by its tags. Only a
 * registered type's fields are abridged: an operation's input is what the model must write, so it keeps every field.
 */
export const labelOf = (ast: SchemaAST.AST, depth: number, abridge = false): string => {
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
    const tags = ast.types.map(tagOf);
    if (abridge && tags.length > MAX_TAGGED_VARIANTS && tags.every((tag) => tag !== undefined)) {
      return `{ _tag: ${tags.map((tag) => JSON.stringify(tag)).join(' | ')}${ABRIDGED_UNION}`;
    }
    // The `undefined` member is how an optional field is spelled; optionality is reported separately.
    const members = ast.types
      .filter((type) => !SchemaAST.isUndefined(type))
      .map((type) => labelOf(type, depth, abridge));
    return [...new Set(members)].join(' | ') || 'undefined';
  }
  if (SchemaAST.isArrays(ast)) {
    const item = ast.rest[0] ?? ast.elements[0];
    if (item === undefined) {
      return 'unknown[]';
    }
    const label = labelOf(item, depth + 1, abridge);
    return label.includes(' | ') ? `(${label})[]` : `${label}[]`;
  }
  if (SchemaAST.isObjects(ast)) {
    // A record or open struct (`Obj.Unknown`) has no closed field list to state.
    if (ast.propertySignatures.length === 0 || ast.indexSignatures.length > 0) {
      return 'object';
    }
    const fields = ast.propertySignatures.map(
      (property) =>
        `${String(property.name)}${SchemaAST.isOptional(property.type) ? '?' : ''}: ${labelOf(property.type, depth + 1, abridge)}`,
    );
    return `{ ${fields.join(', ')} }`;
  }
  if (SchemaAST.isSuspend(ast)) {
    return labelOf(ast.thunk(), depth + 1, abridge);
  }
  return 'unknown';
};

/** Fields as one line, e.g. `title: string, priority?: number`. */
export const renderFields = (fields: readonly FieldDescription[]): string =>
  fields.map(({ name, type, optional }) => `${name}${optional ? '?' : ''}: ${type}`).join(', ');
