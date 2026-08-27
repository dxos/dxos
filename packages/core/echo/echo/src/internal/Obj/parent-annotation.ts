//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';

import { SchemaAST, SchemaEx } from '@dxos/effect';

import { SetParentAnnotation, getFromAst } from '../Annotation';
import { KindId, ParentId, getSchema } from '../common/types';
import { EntityKind } from '../common/types/entity';
import { Ref } from '../Ref/ref';

/** Path to an owning field, relative to the holder (nested inside plain structs, e.g. `backend.config`). */
type Path = readonly string[];

/**
 * Owning-field paths relative to an AST node, per {@link SetParentAnnotation}. Memoized per node —
 * a schema's annotations do not change once it is built (a dynamic type rebuilds its AST, yielding
 * fresh keys) — which also keeps the walk linear in nodes over a schema whose nested types repeat.
 */
const cache = new WeakMap<SchemaAST.AST, readonly Path[]>();

const isOwning = (ast: SchemaAST.AST): boolean => Option.getOrElse(getFromAst(ast, SetParentAnnotation), () => false);

const collect = (ast: SchemaAST.AST): readonly Path[] => {
  const cached = cache.get(ast);
  if (cached) {
    return cached;
  }
  // Seed before recursing: a self-referencing `Schema.suspend` field resolves back to this node, and
  // an owned field is declared at the level it appears on, so the cycle contributes nothing further.
  cache.set(ast, []);

  const paths: Path[] = [];
  // A union of structs (e.g. a discriminated `spec`) contributes each member's fields at this path.
  if (SchemaAST.isUnion(ast)) {
    for (const member of ast.types) {
      paths.push(...collect(member));
    }
  } else {
    for (const property of SchemaAST.getPropertySignatures(ast)) {
      if (typeof property.name !== 'string') {
        continue;
      }
      // Optionality wraps the field schema in a union; for an array of refs the annotation may sit
      // on either the array or its element.
      const unwrapped = SchemaEx.unwrapOptional(property.type);
      const element = SchemaEx.getArrayElementType(unwrapped);
      if (isOwning(property.type) || isOwning(unwrapped) || (element != null && isOwning(element))) {
        paths.push([property.name]);
      } else {
        // Recurse into nested structs and unions of structs (a ref is a Declaration, which
        // terminates the walk).
        const name = property.name;
        paths.push(...collect(unwrapped).map((path): Path => [name, ...path]));
      }
    }
  }

  cache.set(ast, paths);
  return paths;
};

const setParent = (value: unknown, parent: unknown): void => {
  if (!Ref.isRef(value)) {
    return;
  }
  // Only an already-resolved target can be re-parented synchronously; an unresolved ref names an
  // object whose parent edge is either already written or not this holder's to write. `.target`
  // throws on a ref with neither an inlined target nor a resolver, so gate on `isAvailable`.
  const target: any = value.isAvailable ? value.target : undefined;
  if (target == null || target[KindId] !== EntityKind.Object) {
    return;
  }
  // By id, not identity: the database resolves a parent edge through the working set, which may
  // hand back a different proxy for the same entity — an identity compare would miss the
  // short-circuit and re-write the unchanged edge on every update of the holder.
  if (target[ParentId]?.id === (parent as any)?.id) {
    return;
  }
  target[ParentId] = parent;
};

/**
 * Propagates the parent edge declared by an object's {@link SetParentAnnotation} fields: every
 * resolved ref target held in an owning field gets its parent set to the holding object.
 *
 * Called after object creation (`Obj.make`) and after every change transaction (`Obj.update`) —
 * idempotent, so re-running it over unchanged fields is a no-op.
 */
export const propagateParentAnnotations = (obj: unknown): void => {
  const schema = getSchema(obj);
  if (schema == null) {
    return;
  }

  for (const path of collect(schema.ast)) {
    let value: any = obj;
    for (const key of path) {
      value = value?.[key];
    }
    if (Array.isArray(value)) {
      for (const element of value) {
        setParent(element, obj);
      }
    } else {
      setParent(value, obj);
    }
  }
};
