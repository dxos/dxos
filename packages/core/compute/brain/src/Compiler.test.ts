//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Ast from '@dxos/datalog/Ast';

import * as Compiler from './Compiler.ts';
import * as Vocabulary from './Vocabulary.ts';

const codes = (source: string, options?: Compiler.Options) =>
  Compiler.compile(source, options).diagnostics.map(({ code }) => code);

describe('Compiler', () => {
  test('expands shorthand for canonical predicates', ({ expect }) => {
    const { program } = Compiler.compileOrThrow(`
      achieved(goal) :- helps_with(dima, "agent plugin").
      wake(reply) :- helps_with(F, dima, X), polarity(F, "-").
    `);
    expect(Ast.format(program)).toBe(
      [
        'achieved(goal) :- fact(_, dima, helps_with, "agent plugin").',
        'wake#1(reply, F, X) :- fact(F, dima, helps_with, X), polarity(F, "-").',
        'wake(reply) :- wake#1(reply, F, X).',
      ].join('\n'),
    );
  });

  test('leaves rule-defined predicates alone even when they share a vocabulary name', ({ expect }) => {
    const { program } = Compiler.compileOrThrow(`
      shipped(F) :- about(F, "release"), polarity(F, "+").
      achieved(goal) :- shipped(F).
    `);
    expect(Ast.format(program)).toContain('achieved(goal) :- shipped(F).');
  });

  test('rejects synonyms, unknown shorthand and wrong shorthand arity', ({ expect }) => {
    const synonym = Compiler.compile('achieved(goal) :- working_on(dima, X).');
    expect(synonym.diagnostics).toEqual([
      expect.objectContaining({ code: 'vocabulary', message: expect.stringContaining('canonical predicate works_on') }),
    ]);
    expect(codes('achieved(goal) :- helps_wiht(dima, X).')).toEqual(['undefined']);
    expect(codes('achieved(goal) :- helps_with(dima).')).toEqual(['vocabulary']);
    expect(codes('achieved(goal) :- fact(F, dima, "will-work-on", X).')).toEqual(['vocabulary']);
  });

  test('accepts open-vocabulary predicates written against fact/4', ({ expect }) => {
    expect(codes('wake(email) :- fact(F, M, "ships-on", inbox).')).toEqual([]);
  });

  test('checks goal heads and base relations', ({ expect }) => {
    expect(codes('achieved(X) :- speaker(X, dima).')).toEqual(['goal']);
    expect(codes('achieved(me) :- speaker(_, dima).')).toEqual(['goal']);
    expect(codes('wake(L) :- speaker(_, L).')).toEqual(['goal']);
    expect(codes('speaker(F, dima) :- fact(F, _, _, _).')).toEqual(['goal']);
    expect(codes('blocks(A) :- action(A, book_meeting).')).toEqual([]);
  });

  test('reports parse errors and engine checks with positions', ({ expect }) => {
    expect(Compiler.compile('wake(x) :- speaker(F, dima)').diagnostics).toEqual([
      expect.objectContaining({ code: 'parse', position: { line: 1, column: 28 } }),
    ]);
    expect(codes('wake(x) :- about(F, T).')).toEqual(['unsafe', 'unsafe']);
    expect(codes('wake(x) :- speaker(F, dima, now).')).toEqual(['arity']);
    expect(codes('p :- not q.\nq :- not p.\nwake(x) :- p.')).toEqual(['unstratifiable']);
  });

  test('uses a custom vocabulary', ({ expect }) => {
    const vocabulary = Vocabulary.make([{ predicate: 'likes', synonyms: ['enjoys'] }]);
    expect(codes('wake(x) :- likes(alice, X).', { vocabulary })).toEqual([]);
    expect(codes('wake(x) :- enjoys(alice, X).', { vocabulary })).toEqual(['vocabulary']);
    expect(() => Vocabulary.make([{ predicate: 'speaker' }], ['speaker'])).toThrow(/reserved/);
    expect(() => Vocabulary.make([{ predicate: 'Likes' }])).toThrow(/lowercase/);
    expect(() =>
      Vocabulary.make([
        { predicate: 'likes', synonyms: ['fond-of'] },
        { predicate: 'loves', synonyms: ['fond of'] },
      ]),
    ).toThrow(/maps to both/);
    expect(vocabulary.resolve('Enjoys')).toBe('likes');
    expect(vocabulary.resolve('hates')).toBe('hates');
  });
});
