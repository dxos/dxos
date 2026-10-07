//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import type * as Ast from './Ast.ts';
import * as Builtin from './Builtin.ts';
import * as Checker from './Checker.ts';
import * as Engine from './Engine.ts';
import * as Parser from './Parser.ts';

const TRANSITIVE_CLOSURE = `
  path(X, Y) :- edge(X, Y).
  path(X, Z) :- path(X, Y), edge(Y, Z).
`;

describe('Engine', () => {
  test('computes transitive closure', ({ expect }) => {
    const engine = Engine.make({ program: Parser.parse(`${TRANSITIVE_CLOSURE} edge(a, b). edge(b, c). edge(c, d).`) });
    expect(sorted(engine.query('path'))).toEqual([
      ['a', 'b'],
      ['a', 'c'],
      ['a', 'd'],
      ['b', 'c'],
      ['b', 'd'],
      ['c', 'd'],
    ]);
    expect(engine.query('path', ['b'])).toHaveLength(2);
  });

  test('evaluates stratified negation', ({ expect }) => {
    const engine = Engine.make({
      program: Parser.parse(`
        ${TRANSITIVE_CLOSURE}
        node(a). node(b). node(c).
        edge(a, b).
        unreachable(X, Y) :- node(X), node(Y), X != Y, not path(X, Y).
      `),
    });
    expect(sorted(engine.query('unreachable'))).toEqual([
      ['a', 'c'],
      ['b', 'a'],
      ['b', 'c'],
      ['c', 'a'],
      ['c', 'b'],
    ]);

    const changes = engine.insert('edge', ['b', 'c']);
    expect(sorted(changes.added.get('path') ?? [])).toEqual([
      ['a', 'c'],
      ['b', 'c'],
    ]);
    expect(sorted(changes.removed.get('unreachable') ?? [])).toEqual([
      ['a', 'c'],
      ['b', 'c'],
    ]);
  });

  test('evaluates aggregates', ({ expect }) => {
    const engine = Engine.make({
      program: Parser.parse(`
        order(alice, 10). order(alice, 5). order(bob, 7). customer(alice). customer(bob). customer(carol).
        orders(C, N) :- customer(C), N = count : { order(C, _) }.
        spend(C, S) :- customer(C), S = sum A : { order(C, A) }.
        largest(C, M) :- customer(C), M = max A : { order(C, A) }.
        smallest(M) :- M = min A : order(_, A).
        busy(C) :- orders(C, N), N >= 2.
      `),
    });
    expect(sorted(engine.query('orders'))).toEqual([
      ['alice', 2],
      ['bob', 1],
      ['carol', 0],
    ]);
    expect(sorted(engine.query('spend'))).toEqual([
      ['alice', 15],
      ['bob', 7],
      ['carol', 0],
    ]);
    expect(sorted(engine.query('largest'))).toEqual([
      ['alice', 10],
      ['bob', 7],
    ]);
    expect(engine.query('smallest')).toEqual([[5]]);
    expect(engine.query('busy')).toEqual([['alice']]);

    const changes = engine.insert('order', ['bob', 1]);
    expect(changes.added.get('busy')).toEqual([['bob']]);
    expect(changes.removed.get('smallest')).toEqual([[5]]);
    expect(engine.query('smallest')).toEqual([[1]]);
  });

  test('calls built-ins, including ones that bind arguments', ({ expect }) => {
    const index = new Map([
      ['f1', 'the release shipped'],
      ['f2', 'lunch at noon'],
    ]);
    const about = Builtin.make({
      name: 'about',
      arity: 2,
      modes: ['fb'],
      evaluate: ([fact, text]) =>
        [...index]
          .filter(([id, body]) => (fact === undefined || id === fact) && body.includes(String(text)))
          .map(([id]) => [id, String(text)]),
    });
    const length = Builtin.make({
      name: 'length',
      arity: 2,
      modes: ['bf'],
      evaluate: ([value]) => (value === undefined ? [] : [[value, String(value).length]]),
    });
    const engine = Engine.make({
      builtins: Builtin.registry(about, length),
      relations: { speaker: 2 },
      program: Parser.parse(`
        topic(F) :- about(F, "release").
        long(F, N) :- speaker(F, _), length(F, N), N > 1.
        quiet(F) :- speaker(F, _), not about(F, "release").
      `),
    });
    expect(engine.query('topic')).toEqual([['f1']]);
    engine.insert('speaker', ['f1', 'dima'], ['f2', 'alice']);
    expect(sorted(engine.query('long'))).toEqual([
      ['f1', 2],
      ['f2', 2],
    ]);
    expect(engine.query('quiet')).toEqual([['f2']]);

    index.set('f3', 'release notes');
    expect(engine.update({}).added.get('topic')).toEqual([['f3']]);
  });

  test('re-evaluates volatile built-ins on refresh', ({ expect }) => {
    let now = 0;
    const after = Builtin.predicate('after', 1, ([time]) => now >= Number(time), { volatile: true });
    const engine = Engine.make({
      builtins: Builtin.registry(after),
      program: Parser.parse(`
        due(T) :- deadline(T), after(T).
        overdue :- due(_), not done.
      `),
    });
    engine.insert('deadline', [10]);
    expect(engine.query('due')).toEqual([]);

    now = 20;
    expect(engine.update({}).added.size).toBe(0);
    const changes = engine.update({ refresh: true });
    expect(changes.added.get('due')).toEqual([[10]]);
    expect(changes.added.get('overdue')).toEqual([[]]);

    expect(engine.insert('done', []).removed.get('overdue')).toEqual([[]]);
  });

  test('incremental insertion returns only new tuples', ({ expect }) => {
    const engine = Engine.make({ program: Parser.parse(TRANSITIVE_CLOSURE) });
    const first = engine.insert('edge', ['a', 'b'], ['b', 'c']);
    expect(sorted(first.added.get('path') ?? [])).toEqual([
      ['a', 'b'],
      ['a', 'c'],
      ['b', 'c'],
    ]);
    const second = engine.insert('edge', ['c', 'd'], ['a', 'b']);
    expect(second.added.get('edge')).toEqual([['c', 'd']]);
    expect(sorted(second.added.get('path') ?? [])).toEqual([
      ['a', 'd'],
      ['b', 'd'],
      ['c', 'd'],
    ]);
    expect(engine.insert('edge', ['a', 'b']).added.size).toBe(0);
  });

  test('retraction removes derived tuples', ({ expect }) => {
    const engine = Engine.make({ program: Parser.parse(TRANSITIVE_CLOSURE) });
    engine.insert('edge', ['a', 'b'], ['b', 'c']);
    const changes = engine.update({ retract: [{ relation: 'edge', tuple: ['b', 'c'] }] });
    expect(sorted(changes.removed.get('path') ?? [])).toEqual([
      ['a', 'c'],
      ['b', 'c'],
    ]);
    expect(engine.query('path')).toEqual([['a', 'b']]);
  });

  test('records provenance', ({ expect }) => {
    const engine = Engine.make({ program: Parser.parse(TRANSITIVE_CLOSURE) });
    engine.insert('edge', ['a', 'b'], ['b', 'c'], ['x', 'y']);
    expect(engine.derivation('path', ['a', 'c'])).toEqual({
      rule: 1,
      premises: [
        { relation: 'path', tuple: ['a', 'b'] },
        { relation: 'edge', tuple: ['b', 'c'] },
      ],
    });
    expect(engine.provenance('path', ['a', 'c'])).toEqual([
      { relation: 'edge', tuple: ['a', 'b'] },
      { relation: 'edge', tuple: ['b', 'c'] },
    ]);
    expect(engine.provenance('edge', ['x', 'y'])).toEqual([{ relation: 'edge', tuple: ['x', 'y'] }]);
    expect(engine.provenance('path', ['c', 'a'])).toEqual([]);
  });

  test('rejects invalid programs and inconsistent inserts', ({ expect }) => {
    expect(() => Engine.make({ program: Parser.parse('p :- not q. q :- not p.') })).toThrow(Checker.CheckError);
    const engine = Engine.make({ program: Parser.parse(TRANSITIVE_CLOSURE) });
    expect(() => engine.insert('edge', ['a'])).toThrow(/Arity mismatch/);
  });

  test('distinguishes numbers from numeric strings', ({ expect }) => {
    const engine = Engine.make({ program: Parser.parse('p(1). p("1"). one(X) :- p(X), X = 1.') });
    expect(engine.query('p')).toHaveLength(2);
    expect(engine.query('one')).toEqual([[1]]);
  });

  test('closes 5,000 edges incrementally within budget', ({ expect }) => {
    const chains = 50;
    const length = 100;
    const engine = Engine.make({ program: Parser.parse(TRANSITIVE_CLOSURE) });
    const start = Date.now();
    for (let chain = 0; chain < chains; chain++) {
      engine.update({
        insert: Array.from({ length }, (_, node) => ({
          relation: 'edge',
          tuple: [`c${chain}n${node}`, `c${chain}n${node + 1}`],
        })),
      });
    }
    const elapsed = Date.now() - start;
    expect(engine.query('path')).toHaveLength(chains * ((length * (length + 1)) / 2));
    expect(elapsed).toBeLessThan(20_000);

    const changes = engine.insert('edge', ['c0n100', 'c1n0']);
    expect(changes.added.get('path')).toHaveLength(101 * 101);
  });
});

const sorted = (tuples: ReadonlyArray<Ast.Tuple>): Ast.Tuple[] =>
  [...tuples].sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
