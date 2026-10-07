//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { BaseError } from '@dxos/errors';

import type * as Ast from './Ast.ts';
import { LexError, type Token, tokenize } from './internal/lexer.ts';

/** A syntax error with the 1-based position of the offending token. */
export class ParseError extends BaseError.extend('ParseError', 'Syntax error') {
  constructor(
    readonly reason: string,
    readonly position: Ast.Position,
  ) {
    super({ message: reason, context: { line: position.line, column: position.column } });
  }
}

const AGGREGATES: ReadonlyArray<Ast.AggregateFunction> = ['count', 'min', 'max', 'sum'];

const isAggregateFunction = (text: string): text is Ast.AggregateFunction => AGGREGATES.some((name) => name === text);

const OPERATORS: ReadonlyArray<Ast.ComparisonOperator> = ['=', '!=', '<', '<=', '>', '>='];

const toOperator = (text: string): Ast.ComparisonOperator | undefined => OPERATORS.find((op) => op === text);

/**
 * Parses dialect source (Soufflé-like: `head :- body.`, `not`/`!` negation, comparisons and
 * `N = count : { … }` aggregates) into a program.
 * @throws ParseError on the first syntax error.
 */
export const parse = (source: string): Ast.Program => {
  let tokens: Token[];
  try {
    tokens = tokenize(source);
  } catch (error) {
    if (error instanceof LexError) {
      throw new ParseError(error.reason, error.position);
    }
    throw error;
  }

  let cursor = 0;
  let anonymous = 0;
  const end = (): Ast.Position => {
    const last = tokens.at(-1);
    return last
      ? { line: last.position.line, column: last.position.column + last.text.length }
      : { line: 1, column: 1 };
  };
  const peek = (ahead = 0): Token | undefined => tokens[cursor + ahead];
  const fail = (expected: string, token = peek()): never => {
    throw new ParseError(
      token ? `Expected ${expected} but found '${token.text}'` : `Expected ${expected} but reached end of input`,
      token?.position ?? end(),
    );
  };
  const expect = (type: Token['type'], description = `'${type}'`): Token => {
    const token = peek();
    if (!token || token.type !== type) {
      return fail(description);
    }
    cursor++;
    return token;
  };

  const term = (): Ast.Term => {
    const token = peek();
    switch (token?.type) {
      case 'variable':
        cursor++;
        return token.text === '_'
          ? { type: 'variable', name: `_${anonymous++}`, anonymous: true }
          : { type: 'variable', name: token.text };
      case 'identifier':
      case 'string':
      case 'number':
        cursor++;
        return { type: 'constant', value: token.value ?? token.text };
      default:
        return fail('a term');
    }
  };

  const atom = (): Ast.Atom => {
    const name = expect('identifier', 'a predicate name');
    const terms: Ast.Term[] = [];
    if (peek()?.type === '(') {
      cursor++;
      if (peek()?.type !== ')') {
        terms.push(term());
        while (peek()?.type === ',') {
          cursor++;
          terms.push(term());
        }
      }
      expect(')', "',' or ')'");
    }
    return { predicate: name.text, terms };
  };

  const aggregate = (result: Ast.Term, position: Ast.Position): Ast.AggregateLiteral => {
    const name = expect('identifier', 'an aggregate function');
    if (!isAggregateFunction(name.text)) {
      return fail('count, min, max or sum', name);
    }
    const target = name.text === 'count' ? undefined : term();
    expect(':', "':'");
    let body: Ast.Literal[];
    if (peek()?.type === '{') {
      cursor++;
      body = conjunction();
      expect('}', "',' or '}'");
    } else {
      body = [literal()];
    }
    if (body.some((item) => item.type === 'aggregate')) {
      throw new ParseError('Aggregates cannot be nested', position);
    }
    return { type: 'aggregate', function: name.text, result, target, body, position };
  };

  /** `fn :` or `fn Term :` after `=`; unknown function names are reported by `aggregate`. */
  const isAggregateAhead = (): boolean =>
    peek()?.type === 'identifier' && (peek(1)?.type === ':' || peek(2)?.type === ':');

  const literal = (): Ast.Literal => {
    const token = peek();
    if (!token) {
      return fail('a literal');
    }
    const position = token.position;
    if (token.type === '!' || (token.type === 'identifier' && token.text === 'not' && peek(1)?.type !== ':-')) {
      cursor++;
      if (peek()?.type === '(' && token.type === 'identifier') {
        cursor++;
        const negated = atom();
        expect(')', "')'");
        return { type: 'atom', atom: negated, negated: true, position };
      }
      return { type: 'atom', atom: atom(), negated: true, position };
    }
    if (peek(1)?.type === 'operator' || token.type !== 'identifier') {
      const left = term();
      const operatorToken = expect('operator', 'a comparison operator');
      const operator = toOperator(operatorToken.text) ?? fail('a comparison operator', operatorToken);
      if (operator === '=' && isAggregateAhead()) {
        return aggregate(left, position);
      }
      return { type: 'comparison', operator, left, right: term(), position };
    }
    return { type: 'atom', atom: atom(), negated: false, position };
  };

  const conjunction = (): Ast.Literal[] => {
    const literals = [literal()];
    while (peek()?.type === ',') {
      cursor++;
      literals.push(literal());
    }
    return literals;
  };

  const rules: Ast.Rule[] = [];
  while (cursor < tokens.length) {
    const position = peek()?.position;
    const head = atom();
    let body: Ast.Literal[] = [];
    if (peek()?.type === ':-') {
      cursor++;
      body = conjunction();
    }
    expect('.', "'.', ',' or ':-'");
    rules.push({ head, body, position });
  }
  return { rules };
};
