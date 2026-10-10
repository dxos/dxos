//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Ast from './Ast.ts';
import * as Parser from './Parser.ts';

describe('Parser', () => {
  test('parses facts, rules, strings, numbers and anonymous variables', ({ expect }) => {
    const program = Parser.parse(`
      % a comment
      edge(a, "b c", 3).
      path(X, Y) :- edge(X, Y, _). // trailing comment
      /* block
         comment */
      wake(followup) :- elapsed(goal, 2d), not achieved(goal).
    `);
    expect(program.rules).toHaveLength(3);
    expect(program.rules[0].head.terms).toEqual([Ast.constant('a'), Ast.constant('b c'), Ast.constant(3)]);
    expect(program.rules[1].body[0]).toMatchObject({
      type: 'atom',
      negated: false,
      atom: { predicate: 'edge', terms: [{ name: 'X' }, { name: 'Y' }, { anonymous: true }] },
    });
    expect(program.rules[2].body[0]).toMatchObject({ atom: { terms: [{ value: 'goal' }, { value: '2d' }] } });
    expect(program.rules[2].body[1]).toMatchObject({ type: 'atom', negated: true, atom: { predicate: 'achieved' } });
    expect(program.rules[1].position).toEqual({ line: 4, column: 7 });
  });

  test('parses negation forms, comparisons and zero-arity atoms', ({ expect }) => {
    const program = Parser.parse('p :- q(X), !r(X), not(s(X)), X != "x", X >= -2.5, done.');
    const [q, r, s, notEqual, greater, done] = program.rules[0].body;
    expect(q).toMatchObject({ type: 'atom', negated: false });
    expect(r).toMatchObject({ type: 'atom', negated: true, atom: { predicate: 'r' } });
    expect(s).toMatchObject({ type: 'atom', negated: true, atom: { predicate: 's' } });
    expect(notEqual).toMatchObject({ type: 'comparison', operator: '!=', right: { value: 'x' } });
    expect(greater).toMatchObject({ type: 'comparison', operator: '>=', right: { value: -2.5 } });
    expect(done).toMatchObject({ type: 'atom', atom: { predicate: 'done', terms: [] } });
  });

  test('parses aggregates', ({ expect }) => {
    const program = Parser.parse(`
      total(N) :- N = count : { item(_) }.
      cheapest(M) :- M = min P : { price(_, P) }.
      spend(C, S) :- customer(C), S = sum A : order(C, A).
    `);
    expect(program.rules[0].body[0]).toMatchObject({ type: 'aggregate', function: 'count', target: undefined });
    expect(program.rules[1].body[0]).toMatchObject({ type: 'aggregate', function: 'min', target: { name: 'P' } });
    expect(program.rules[2].body[1]).toMatchObject({
      type: 'aggregate',
      function: 'sum',
      body: [{ type: 'atom', atom: { predicate: 'order' } }],
    });
  });

  test('round-trips through format', ({ expect }) => {
    const source =
      'achieved(goal) :- fact(F, dima, helps_with, "agent plugin"), polarity(F, "+"), N = count : { p(F) }, N > 1.';
    expect(Ast.format(Parser.parse(source))).toBe(source);
    expect(Parser.parse(Ast.format(Parser.parse(source)))).toEqual(Parser.parse(source));
  });

  test.for([
    ['p(X) :- q(X)', 1, 13, "Expected '.', ',' or ':-' but reached end of input"],
    ['p(X) :- q(X)\n.\nr(', 3, 3, 'Expected a term but reached end of input'],
    ['p(X :- q(X).', 1, 5, "Expected ',' or ')' but found ':-'"],
    ['p(X) :- \n  q(X), "a".', 2, 12, "Expected a comparison operator but found '.'"],
    ['p("unterminated) .', 1, 3, 'Unterminated string'],
    ['p(X) :- q(X) ; r(X).', 1, 14, "Unexpected character ';'"],
    ['Foo(X).', 1, 1, "Expected a predicate name but found 'Foo'"],
    ['p(N) :- N = avg X : { q(X) }.', 1, 13, "Expected count, min, max or sum but found 'avg'"],
  ] as const)('rejects %j at %i:%i', ([source, line, column, reason], { expect }) => {
    let error: unknown;
    try {
      Parser.parse(source);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(Parser.ParseError);
    expect(error).toMatchObject({ position: { line, column }, reason });
  });
});
