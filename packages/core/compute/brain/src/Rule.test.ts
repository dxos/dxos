//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Rule from './Rule.ts';

describe('Rule', () => {
  it.effect(
    'parses rules, facts and constraints in Datalog notation',
    Effect.fnUntraced(function* () {
      const program = yield* Rule.parse(`
        % Goal 3, compiled.
        goal(g3).
        wake(G, reply) :- goal(G), fact(F, _, _, _), speaker(F, dima), force(F, commissive), about(F, "agent plugin").
        ! contradiction :- fact(A, S, P, O), polarity(A, "+"), fact(B, S, P, O), polarity(B, "-").
        :- fact(F, _, books_meeting, friday).
      `);

      expect(program.rules).toHaveLength(2);
      expect(program.rules[0]).toEqual({
        head: { predicate: 'goal', args: [{ _tag: 'constant', value: 'g3' }] },
        body: [],
      });
      expect(program.rules[1].body.map((literal) => literal._tag)).toEqual([
        'positive',
        'positive',
        'positive',
        'positive',
        'builtin',
      ]);
      expect(program.constraints.map(({ name }) => name)).toEqual(['contradiction', 'constraint1']);
    }),
  );

  it.effect(
    'reads constants, numbers, booleans, durations and anonymous variables',
    Effect.fnUntraced(function* () {
      const [rule] = (yield* Rule.parse('p(X, "two words", 3, 1.5, true, 2d, 90m, -7d, _) :- q(X, _), r(_).')).rules;
      expect(rule.head.args).toEqual([
        { _tag: 'variable', name: 'X' },
        { _tag: 'constant', value: 'two words' },
        { _tag: 'constant', value: 3 },
        { _tag: 'constant', value: 1.5 },
        { _tag: 'constant', value: true },
        { _tag: 'constant', value: 2 * 86_400_000 },
        { _tag: 'constant', value: 90 * 60_000 },
        { _tag: 'constant', value: -7 * 86_400_000 },
        { _tag: 'variable', name: '_#1' },
      ]);
      // Each `_` is its own variable, so `q(X, _), r(_)` does not join on it.
      const anonymous = rule.body.flatMap((literal) =>
        literal._tag === 'positive' ? literal.atom.args.filter((term) => term._tag === 'variable') : [],
      );
      expect(new Set(anonymous.map((term) => (term._tag === 'variable' ? term.name : ''))).size).toBe(3);
    }),
  );

  it.effect(
    'parses negation and count heads',
    Effect.fnUntraced(function* () {
      const program = yield* Rule.parse(`
        open(G) :- goal(G), not achieved(G).
        replies(X, count(F)) :- fact(F, X, replied, _).
      `);
      expect(program.rules[0].body[1]).toEqual({
        _tag: 'negative',
        atom: { predicate: 'achieved', args: [{ _tag: 'variable', name: 'G' }] },
      });
      expect(program.rules[1].head.args[1]).toEqual({ _tag: 'count', variable: 'F' });
    }),
  );

  it.effect(
    'formats rules back to Datalog notation',
    Effect.fnUntraced(function* () {
      const source = 'open(G) :- goal(G), not achieved(G), fact(F, G, "said to", _), gte(F, 2).';
      const [rule] = (yield* Rule.parse(source)).rules;
      expect(Rule.format(rule)).toBe(source);
      const reparsed = (yield* Rule.parse(Rule.format(rule))).rules[0];
      expect(Rule.format(reparsed)).toBe(source);
      expect(Rule.formatAtom({ predicate: 'wake', args: ['g3', 'reply', 2, 'Two words'] })).toBe(
        'wake(g3, reply, 2, "Two words")',
      );
    }),
  );

  it.effect(
    'parses conjunctive queries',
    Effect.fnUntraced(function* () {
      const query = yield* Rule.parseQuery('wake(G, R), not achieved(G), neq(R, followup).');
      expect(query.map((literal) => literal._tag)).toEqual(['positive', 'negative', 'builtin']);
    }),
  );

  it.effect(
    'reports malformed text as a typed parse error',
    Effect.fnUntraced(function* () {
      const sources = [
        'p(X) :- q(X)',
        'p(X) :- "unterminated',
        'P(x).',
        'p(X) :- not eq(X, 1).',
        'p(X) :- q(X) # r(X).',
        'p(count(_)) :- q(X).',
      ];
      for (const source of sources) {
        const error = yield* Effect.flip(Rule.parse(source));
        expect(error).toBeInstanceOf(Rule.ParseError);
        expect(error._tag).toBe('ParseError');
      }
      expect(yield* Effect.flip(Rule.parseQuery('wake(G) extra'))).toBeInstanceOf(Rule.ParseError);
    }),
  );
});
