//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Builtin from './Builtin.ts';
import * as Engine from './Engine.ts';
import * as Parser from './Parser.ts';

describe('Engine in workerd', () => {
  test('runs inside the Cloudflare Workers runtime', ({ expect }) => {
    expect(globalThis).toHaveProperty('navigator.userAgent', 'Cloudflare-Workers');
  });

  test('evaluates a stratified program incrementally', ({ expect }) => {
    const engine = Engine.make({
      builtins: Builtin.registry(Builtin.predicate('positive', 1, ([value]) => Number(value) > 0)),
      program: Parser.parse(`
        path(X, Y) :- edge(X, Y).
        path(X, Z) :- path(X, Y), edge(Y, Z).
        weighted(X, N) :- node(X), N = count : { edge(X, _) }, positive(N).
        isolated(X) :- node(X), not path(X, _).
      `),
    });
    engine.insert('node', ['a'], ['b'], ['c']);
    expect(engine.query('isolated')).toHaveLength(3);
    const changes = engine.insert('edge', ['a', 'b'], ['b', 'c']);
    expect(changes.added.get('path')).toHaveLength(3);
    expect(engine.query('isolated')).toEqual([['c']]);
    expect(engine.provenance('path', ['a', 'c'])).toHaveLength(2);
  });
});
