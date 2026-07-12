//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { Obj, Type } from '@dxos/echo';
import { type AtprotoRecord, AtprotoRecordAnnotation, type AtprotoVisibility, AtprotoVisibilityAnnotation } from '@dxos/schema';

/** Read the atproto record annotation off an object's type, if any. */
export const getRecordAnnotation = (object: Obj.Unknown): AtprotoRecord | undefined => {
  const type = Obj.getType(object);
  if (!type) {
    return undefined;
  }
  return Option.getOrUndefined(AtprotoRecordAnnotation.get(Type.getSchema(type)));
};

export type FieldPublishFlag = {
  /** Field label (leaf/struct name). */
  name: string;
  /** JSONPath to the field (e.g. `catalog.title`), for reading its value and correlating notes. */
  path: string;
  /** Nesting depth (0 = top level), for indentation. */
  depth: number;
  /** True when this row is a struct header (has children); it carries no value or tag. */
  group: boolean;
  /** The field's effective network visibility (own annotation, else inherited, else `private`). */
  visibility: AtprotoVisibility;
};

/**
 * The visibility annotation set anywhere on a property's type, if any. Optional fields wrap the value
 * type in a `Union(X, undefined)` — and refinements/transforms nest it further — so an annotation
 * applied to the value schema before `Schema.optional` sits below `property.type`, not on it. Search
 * through those wrappers so annotations on optional fields are recognized.
 */
const ownVisibility = (ast: SchemaAST.AST): AtprotoVisibility | undefined => {
  const own = AtprotoVisibilityAnnotation.getFromAst(ast);
  if (Option.isSome(own)) {
    return own.value;
  }
  if (SchemaAST.isUnion(ast)) {
    for (const member of ast.types) {
      const found = ownVisibility(member);
      if (found) {
        return found;
      }
    }
  }
  if (SchemaAST.isRefinement(ast)) {
    return ownVisibility(ast.from);
  }
  if (SchemaAST.isTransformation(ast)) {
    return ownVisibility(ast.to) ?? ownVisibility(ast.from);
  }
  return undefined;
};

/** Unwrap an optional/refined/transformed struct field to its `TypeLiteral`, if it is one. */
const asStruct = (ast: SchemaAST.AST): SchemaAST.TypeLiteral | undefined => {
  if (SchemaAST.isTypeLiteral(ast)) {
    return ast;
  }
  if (SchemaAST.isUnion(ast)) {
    for (const member of ast.types) {
      const struct = asStruct(member);
      if (struct) {
        return struct;
      }
    }
  }
  if (SchemaAST.isRefinement(ast)) {
    return asStruct(ast.from);
  }
  if (SchemaAST.isTransformation(ast)) {
    return asStruct(ast.to);
  }
  return undefined;
};

const collectFlags = (
  ast: SchemaAST.AST,
  prefix: string,
  depth: number,
  parentVisibility: AtprotoVisibility,
  into: FieldPublishFlag[],
): void => {
  for (const property of SchemaAST.getPropertySignatures(ast)) {
    const name = String(property.name);
    // `id` is an ECHO system field, not part of the object's published projection.
    if (depth === 0 && name === 'id') {
      continue;
    }
    const path = prefix ? `${prefix}.${name}` : name;
    // Visibility is inherited: a field with no own visibility takes its enclosing struct's; an explicit
    // annotation overrides (e.g. a `published` field inside a `mirrored` struct stays published).
    const visibility = ownVisibility(property.type) ?? parentVisibility;
    const struct = asStruct(property.type);
    if (struct) {
      into.push({ name, path, depth, group: true, visibility });
      collectFlags(struct, path, depth + 1, visibility, into);
    } else {
      into.push({ name, path, depth, group: false, visibility });
    }
  }
};

/** Enumerate a schema's fields, descending fully into nested structs, with their effective visibility. */
export const getFieldPublishFlags = (schema: Schema.Schema.AnyNoContext): FieldPublishFlag[] => {
  const flags: FieldPublishFlag[] = [];
  collectFlags(schema.ast, '', 0, 'private', flags);
  return flags;
};
