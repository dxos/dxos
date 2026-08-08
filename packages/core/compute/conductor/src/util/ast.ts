//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Option from 'effect/Option';
import * as Predicate from 'effect/Predicate';
import * as Schema from 'effect/Schema';

import { SchemaAST } from '@dxos/effect';

/**
 * @param schema
 * @param property
 */
export const pickProperty = <S extends Schema.Top, K extends keyof Schema.Schema.Type<S>>(
  schema: S,
  property: K,
): Schema.Codec<Schema.Schema.Type<S>[K], any> => {
  return Schema.make(getPropertyKeyIndexedAccess(schema.ast, property).type);
};

// Copied from effect.
// TODO(burdon): Reconcile with common/effect.

/** @internal */
export const getPropertyKeyIndexedAccess = (ast: SchemaAST.AST, name: PropertyKey): SchemaAST.PropertySignature => {
  // v4's property signature carries only a name and a type; the modifiers live on the type's
  // context, and there is no `Refinement` node to unwrap.
  switch (ast._tag) {
    case 'Objects': {
      const ps = getTypeLiteralPropertySignature(ast, name);
      if (ps) {
        return ps;
      }
      break;
    }
    case 'Union':
      return new SchemaAST.PropertySignature(
        name,
        new SchemaAST.Union(
          ast.types.map((member) => getPropertyKeyIndexedAccess(member, name).type),
          ast.mode,
        ),
      );
    case 'Suspend':
      return getPropertyKeyIndexedAccess(ast.thunk(), name);
  }

  return new SchemaAST.PropertySignature(name, SchemaAST.neverKeyword);
};

const getTypeLiteralPropertySignature = (
  ast: SchemaAST.TypeLiteral,
  name: PropertyKey,
): SchemaAST.PropertySignature | undefined => {
  // from property signatures...
  const ops = Array.findFirst(ast.propertySignatures, (ps) => ps.name === name);
  if (Option.isSome(ops)) {
    return ops.value;
  }

  // from index signatures...
  if (Predicate.isString(name)) {
    let out: SchemaAST.PropertySignature | undefined;
    for (const is of ast.indexSignatures) {
      const parameterBase = getParameterBase(is.parameter);
      switch (parameterBase._tag) {
        case 'TemplateLiteral': {
          // const regex = getTemplateLiteralRegExp(parameterBase)
          // if (regex.test(name)) {
          //   return new SchemaAST.PropertySignature(name, is.type, false, true)
          // }
          // break
          throw new Error('TODO');
        }
        case 'String': {
          if (out === undefined) {
            out = new SchemaAST.PropertySignature(name, is.type);
          }
        }
      }
    }
    if (out) {
      return out;
    }
  } else if (Predicate.isSymbol(name)) {
    for (const is of ast.indexSignatures) {
      const parameterBase = getParameterBase(is.parameter);
      if (SchemaAST.isSymbolKeyword(parameterBase)) {
        return new SchemaAST.PropertySignature(name, is.type);
      }
    }
  }
};

export const getParameterBase = (ast: SchemaAST.AST): SchemaAST.AST => ast;
