//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as Term from './Term.ts';

describe('Term', () => {
  test('a gap is distinct from TypeScript `unknown` and says why', () => {
    expect(Term.text(Term.unresolved('flow-sensitive'))).toBe('?flow-sensitive');
    expect(Term.text(Term.primitive('unknown'))).toBe('unknown');
    expect(Term.isPartial(Term.unresolved('x'))).toBe(true);
    expect(Term.isPartial(Term.primitive('unknown'))).toBe(false);
  });

  test('a union of gaps is one gap; a union with a known member is partial', () => {
    expect(Term.union([Term.unresolved('b'), Term.unresolved('a')]).kind).toBe('unresolved');
    expect(Term.text(Term.union([Term.literal(1), Term.unresolved('a')]))).toBe('1 | ?a');
  });

  test('a deferred term records what it owes the binding', () => {
    const deferred = Term.widen(Term.without(Term.typeOf('file:x#y'), ['null', 'undefined']));
    expect(Term.text(deferred)).toBe('widen(nonNullish(typeof <file:x#y>))');
  });

  test('terms survive JSON, freshness included', () => {
    const term = Term.fn(
      [{ type: Term.literal(1, true), optional: true, rest: false }],
      Term.returnOf(Term.typeOf('module:a#b'), [Term.literal(2n)], ['widen']),
      ['T'],
    );
    const read = Term.fromJson(JSON.parse(JSON.stringify(Term.toJson(term))));
    expect(Term.text(read)).toBe(Term.text(term));
    expect(read.kind === 'function' && read.params[0].type.kind === 'literal' && read.params[0].type.fresh).toBe(true);
    expect(Term.fromJson({ k: 'nonsense' }).kind).toBe('unresolved');
  });
});
