//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Builtin from './Builtin.ts';
import * as Checker from './Checker.ts';
import * as Parser from './Parser.ts';

const builtins = Builtin.registry(
  Builtin.make({ name: 'about', arity: 2, modes: ['fb'], evaluate: () => [] }),
  Builtin.predicate('later', 2, ([left, right]) => String(left) > String(right)),
);

const check = (source: string, options: Checker.Options = { builtins }) => Checker.check(Parser.parse(source), options);

describe('Checker', () => {
  test('accepts a safe, stratified program', ({ expect }) => {
    expect(
      check(`
        path(X, Y) :- edge(X, Y).
        path(X, Z) :- path(X, Y), edge(Y, Z).
        unreachable(X, Y) :- node(X), node(Y), not path(X, Y).
        hub(X, N) :- node(X), N = count : { edge(X, _) }, N > 2.
        topic(F) :- about(F, "release").
        recent(F) :- said(F, T), later(T, "2027-01-01").
      `),
    ).toEqual([]);
  });

  test('reports arity mismatches with positions', ({ expect }) => {
    const diagnostics = check('p(X) :- q(X).\nr(X) :- q(X, X).');
    expect(diagnostics).toEqual([
      expect.objectContaining({ code: 'arity', rule: 1, position: { line: 2, column: 9 } }),
    ]);
  });

  test('reports declared relation and built-in arity mismatches', ({ expect }) => {
    const diagnostics = check('p(X) :- fact(X), about(X).', { builtins, relations: { fact: 4 } });
    expect(diagnostics.map(({ code }) => code)).toEqual(['arity', 'arity']);
  });

  test('reports unsafe rules', ({ expect }) => {
    const diagnostics = check(`
      head(X) :- q(Y).
      negated(X) :- q(X), not r(Y).
      compared(X) :- q(X), Y > 3.
      fact(X).
    `);
    expect(diagnostics.map(({ code, rule }) => [code, rule])).toEqual([
      ['unsafe', 0],
      ['unsafe', 1],
      ['unsafe', 2],
      ['unsafe', 3],
    ]);
    expect(diagnostics[1].message).toContain('variable Y under negation');
  });

  test('allows anonymous variables under negation', ({ expect }) => {
    expect(check('empty :- marker(goal), not waiting(_).')).toEqual([]);
  });

  test('checks built-in binding modes', ({ expect }) => {
    expect(check('p(F) :- about(F, T).').map(({ message }) => message)).toEqual([
      expect.stringContaining('no binding mode of built-in about/2 accepts F, T unbound'),
      expect.stringContaining('head variable F is not bound'),
    ]);
    expect(check('p(T) :- later(T, "x").').map(({ code }) => code)).toEqual(['unsafe', 'unsafe']);
    expect(check('p(F) :- q(F), not about(F, "x").')).toEqual([]);
  });

  test('rejects rules that define a built-in', ({ expect }) => {
    expect(check('about(F, T) :- q(F, T).').map(({ code }) => code)).toEqual(['builtin-head']);
  });

  test('rejects negation through recursion', ({ expect }) => {
    const diagnostics = check('p :- not q.\nq :- not p.');
    expect(diagnostics).toEqual([expect.objectContaining({ code: 'unstratifiable' })]);
    expect(diagnostics[0].message).toContain('p, q');
  });

  test('rejects aggregation through recursion', ({ expect }) => {
    const diagnostics = check('size(N) :- N = count : { member(_) }.\nmember(X) :- size(X).');
    expect(diagnostics.map(({ code }) => code)).toEqual(['unstratifiable']);
  });

  test('reports undefined predicates when relations are declared', ({ expect }) => {
    const diagnostics = check('p(X) :- fact(X), typo(X).', { builtins, relations: { fact: 1 } });
    expect(diagnostics).toEqual([
      expect.objectContaining({ code: 'undefined', message: expect.stringContaining('typo/1') }),
    ]);
  });

  test('CheckError formats diagnostics', ({ expect }) => {
    const error = new Checker.CheckError(check('p :- not q.\nq :- not p.'));
    expect(error.message).toMatch(/^Invalid program:\n1:1 unstratifiable:/);
  });
});
