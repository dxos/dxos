//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Option from 'effect/Option';
import * as Predicate from 'effect/Predicate';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

/**
 * @param schema
 * @param property
 */
export const pickProperty = <S extends Schema.Schema.Any, K extends keyof Schema.Schema.Type<S>>(
  schema: S,
  property: K,
): Schema.Schema<Schema.Schema.Type<S>[K], Schema.Schema.Encoded<S>[K], Schema.Schema.Context<S>> => {
  return Schema.make(getPropertyKeyIndexedAccess(schema.ast, property).type);
};

// Copied from effect.
// TODO(burdon): Reconcile with common/effect.

/** @internal */
export const getPropertyKeyIndexedAccess = (ast: SchemaAST.AST, name: PropertyKey): SchemaAST.PropertySignature => {
  switch (ast._tag) {
    case 'TypeLiteral': {
      const ps = getTypeLiteralPropertySignature(ast, name);
      if (ps) {
        return ps;
      }
      break;
    }
    case 'Union':
      return new SchemaAST.PropertySignature(
        name,
        SchemaAST.Union.make(ast.types.map((ast) => getPropertyKeyIndexedAccess(ast, name).type)),
        false,
        true,
      );
    case 'Suspend':
      return getPropertyKeyIndexedAccess(ast.f(), name);
    case 'Refinement':
      return getPropertyKeyIndexedAccess(ast.from, name);
  }

  return new SchemaAST.PropertySignature(name, SchemaAST.neverKeyword, false, true);
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
        case 'StringKeyword': {
          if (out === undefined) {
            out = new SchemaAST.PropertySignature(name, is.type, false, true);
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
        return new SchemaAST.PropertySignature(name, is.type, false, true);
      }
    }
  }
};

export const getParameterBase = (
  ast: SchemaAST.Parameter,
): SchemaAST.StringKeyword | SchemaAST.SymbolKeyword | SchemaAST.TemplateLiteral => {
  switch (ast._tag) {
    case 'StringKeyword':
    case 'SymbolKeyword':
    case 'TemplateLiteral':
      return ast;
    case 'Refinement':
      return getParameterBase(ast.from);
  }
};
