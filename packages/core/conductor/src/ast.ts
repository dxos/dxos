import { AST } from '@effect/schema';
import { Schema } from '@effect/schema';
import * as Arr from 'effect/Array';
import type { Effect } from 'effect/Effect';
import { dual, identity } from 'effect/Function';
import { globalValue } from 'effect/GlobalValue';
import * as Number from 'effect/Number';
import * as Option from 'effect/Option';
import * as Order from 'effect/Order';
import * as Predicate from 'effect/Predicate';
import * as regexp from 'effect/RegExp';
import type { Concurrency } from 'effect/Types';

export const pickProperty = <S extends Schema.Schema.Any, K extends keyof Schema.Schema.Type<S>>(
  schema: S,
  prop: K,
): Schema.Schema<Schema.Schema.Type<S>[K], Schema.Schema.Encoded<S>[K], Schema.Schema.Context<S>> => {
  return Schema.make(getPropertyKeyIndexedAccess(schema.ast, prop).type);
};

// Copy-pasted from @effect/schema.

/** @internal */
export const getPropertyKeyIndexedAccess = (ast: AST.AST, name: PropertyKey): AST.PropertySignature => {
  switch (ast._tag) {
    case 'TypeLiteral': {
      const ps = getTypeLiteralPropertySignature(ast, name);
      if (ps) {
        return ps;
      }
      break;
    }
    case 'Union':
      return new AST.PropertySignature(
        name,
        AST.Union.make(ast.types.map((ast) => getPropertyKeyIndexedAccess(ast, name).type)),
        false,
        true,
      );
    case 'Suspend':
      return getPropertyKeyIndexedAccess(ast.f(), name);
    case 'Refinement':
      return getPropertyKeyIndexedAccess(ast.from, name);
  }
  return new AST.PropertySignature(name, AST.neverKeyword, false, true);
};

const getTypeLiteralPropertySignature = (
  ast: AST.TypeLiteral,
  name: PropertyKey,
): AST.PropertySignature | undefined => {
  // from property signatures...
  const ops = Arr.findFirst(ast.propertySignatures, (ps) => ps.name === name);
  if (Option.isSome(ops)) {
    return ops.value;
  }

  // from index signatures...
  if (Predicate.isString(name)) {
    let out: AST.PropertySignature | undefined = undefined;
    for (const is of ast.indexSignatures) {
      const parameterBase = getParameterBase(is.parameter);
      switch (parameterBase._tag) {
        case 'TemplateLiteral': {
          // const regex = getTemplateLiteralRegExp(parameterBase)
          // if (regex.test(name)) {
          //   return new AST.PropertySignature(name, is.type, false, true)
          // }
          // break
          throw new Error('TODO');
        }
        case 'StringKeyword': {
          if (out === undefined) {
            out = new AST.PropertySignature(name, is.type, false, true);
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
      if (AST.isSymbolKeyword(parameterBase)) {
        return new AST.PropertySignature(name, is.type, false, true);
      }
    }
  }
};

export const getParameterBase = (ast: AST.Parameter): AST.StringKeyword | AST.SymbolKeyword | AST.TemplateLiteral => {
  switch (ast._tag) {
    case 'StringKeyword':
    case 'SymbolKeyword':
    case 'TemplateLiteral':
      return ast;
    case 'Refinement':
      return getParameterBase(ast.from);
  }
};
