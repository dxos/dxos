//
// Copyright 2026 DXOS.org
//

import * as SchemaAST from 'effect/SchemaAST';

import { type Entity, type Registry, Type } from '@dxos/echo';
import { type QueryAST } from '@dxos/echo-protocol';
import { SchemaValidator, getReferenceAst } from '@dxos/echo/internal';
import { DXN } from '@dxos/keys';

import { getEchoDatabase, getObjectCore, isEchoObject } from '../../echo-handler/index.ts';

//
// A query's result type is part of the query: `Query.select(Filter.type(TaskV1))` returns TaskV1, and a
// reference traversal returns the version its schema declares for the reference's target. The host returns
// a row of the version a selection names; a traversal's targets are mapped here, since the query AST names
// only the property it traverses.
//

/**
 * The type URI, version included, of the objects `query` returns, when one type is determined: the type
 * a selection names, or the target a traversed reference's schema declares.
 */
export const declaredResultType = (query: QueryAST.Query, registry: Registry.Registry): string | undefined => {
  switch (query.type) {
    case 'select':
      return query.filter.type === 'object' ? (query.filter.typename ?? undefined) : undefined;
    case 'filter':
      return declaredResultType(query.selection, registry);
    case 'options':
    case 'order':
    case 'limit':
    case 'skip':
    case 'from':
      return declaredResultType(query.query, registry);
    case 'reference-traversal': {
      const anchor = declaredResultType(query.anchor, registry);
      return anchor === undefined ? undefined : referenceTargetType(anchor, query.property, registry);
    }
    default:
      return undefined;
  }
};

/** The type URI a property of type `owner` declares for the target of the reference it holds. */
const referenceTargetType = (owner: string, property: string, registry: Registry.Registry): string | undefined => {
  const entity = registry.getByURI(owner);
  if (!Type.isType(entity)) {
    return undefined;
  }
  const schema = Type.getSchema(entity);
  const path = property.split('.');
  let ast: SchemaAST.AST;
  try {
    ast = SchemaValidator.getPropertySchema(schema, path).ast;
    if (SchemaAST.isArrays(ast)) {
      ast = SchemaValidator.getPropertySchema(schema, [...path, '0']).ast;
    }
  } catch {
    return undefined;
  }
  const reference = [ast, ...(SchemaAST.isUnion(ast) ? ast.types : [])]
    .map((candidate) => getReferenceAst(candidate))
    .find((candidate) => candidate !== undefined);
  return reference && DXN.make(reference.typename, reference.version);
};

/** `object` at the version `query` declares for its results, once that version is bound. */
export const toDeclaredVersion = async (object: Entity.Unknown, query: QueryAST.Query): Promise<Entity.Unknown> => {
  const database = isEchoObject(object) ? getEchoDatabase(getObjectCore(object)) : undefined;
  const type = database && declaredResultType(query, database.graph.registry);
  return type && database ? database._versionOfType(object, type) : object;
};

/**
 * As {@link toDeclaredVersion}, without waiting: undefined until the version is bound, with `onLoad` called
 * once it is.
 */
export const peekDeclaredVersion = (
  object: Entity.Unknown,
  type: string | undefined,
  onLoad: () => void,
): Entity.Unknown | undefined => {
  const database = isEchoObject(object) ? getEchoDatabase(getObjectCore(object)) : undefined;
  return type && database ? database._peekVersionOfType(object, type, onLoad) : object;
};
