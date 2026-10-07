//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as TestClock from 'effect/testing/TestClock';

import * as Brain from './Brain.ts';
import type * as Event from './Event.ts';
import * as Fact from './Fact.ts';
import * as Rule from './Rule.ts';

const TestLayer = Brain.layer();

const MONDAY = Date.parse('2026-10-05T09:00:00Z');
const DAY = 86_400_000;

describe('reasoning', () => {
  describe('derivation', () => {
    it.effect(
      'derives conclusions from facts with a rule',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.addRules({ id: 'likes', rules: 'likes(S, O) :- fact(F, S, likes, O), polarity(F, "+").' });
        yield* brain.push([
          triple('f1', 'alice', 'likes', 'tea'),
          triple('f2', 'bob', 'likes', 'coffee', { polarity: '-' }),
        ]);

        expect(yield* brain.ask('likes(X, Y)')).toEqual([{ X: 'alice', Y: 'tea' }]);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'chains rules across predicates',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.addRules({
          id: 'chain',
          rules: `
            parent(X, Y) :- fact(_, X, parent_of, Y).
            grandparent(X, Z) :- parent(X, Y), parent(Y, Z).
            elder(X) :- grandparent(X, _).
          `,
        });
        yield* brain.push([triple('f1', 'ann', 'parent_of', 'bea'), triple('f2', 'bea', 'parent_of', 'cid')]);

        expect(yield* brain.ask('grandparent(X, Z)')).toEqual([{ X: 'ann', Z: 'cid' }]);
        expect(yield* brain.ask('elder(X)')).toEqual([{ X: 'ann' }]);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'computes recursive closures and terminates on cycles',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.addRules({
          id: 'part-of',
          rules: `
            within(X, Y) :- fact(_, X, part_of, Y).
            within(X, Z) :- within(X, Y), fact(_, Y, part_of, Z).
          `,
        });
        yield* brain.push([
          triple('f1', 'step', 'part_of', 'task'),
          triple('f2', 'task', 'part_of', 'project'),
          triple('f3', 'project', 'part_of', 'program'),
        ]);
        expect((yield* brain.ask('within(step, Z)')).map(({ Z }) => Z)).toEqual(['task', 'project', 'program']);

        // A cycle closes over itself; semi-naive evaluation stops when a round adds nothing.
        yield* brain.push([triple('f4', 'program', 'part_of', 'step')]);
        expect(yield* brain.ask('within(step, step)')).toEqual([{}]);
        expect(yield* brain.ask('within(X, Y)')).toHaveLength(16);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'supports ground facts in rules',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.addRules({ id: 'goals', rules: 'goal(g1). goal(g2). owner(g1, rich).' });
        expect(yield* brain.ask('goal(G), not owner(G, _)')).toEqual([{ G: 'g2' }]);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'evaluates comparison, text and fact built-ins',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.addRules({
          id: 'builtins',
          rules: `
            confident(F) :- fact(F, _, _, _), confidence(F, C), gte(C, 0.8).
            about_release(F) :- fact(F, _, _, _), about(F, "release").
            mentions_plugin(F) :- fact(F, _, _, O), contains(O, "PLUGIN").
            other(F, G) :- fact(F, S, _, _), fact(G, S, _, _), neq(F, G), lt(F, G).
          `,
        });
        yield* brain.push([
          triple('f1', 'dima', 'ships', 'release', { confidence: 0.9 }),
          triple('f2', 'dima', 'works_on', 'agent plugin', { confidence: 0.4 }),
          triple('f3', 'rich', 'reviews', 'docs', { quote: 'after the release' }),
        ]);

        expect(yield* brain.ask('confident(F)')).toEqual([{ F: 'f1' }]);
        expect(yield* brain.ask('about_release(F)')).toEqual([{ F: 'f1' }, { F: 'f3' }]);
        expect(yield* brain.ask('mentions_plugin(F)')).toEqual([{ F: 'f2' }]);
        expect(yield* brain.ask('other(F, G)')).toEqual([{ F: 'f1', G: 'f2' }]);
        // Values of different types never order.
        expect(yield* brain.ask('fact(F, _, _, _), confidence(F, C), gt(C, "0.5")')).toEqual([]);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'counts with aggregate heads',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.addRules({ id: 'count', rules: 'replies(X, count(F)) :- fact(F, X, replied, _).' });
        yield* brain.push([triple('f1', 'dima', 'replied', 'm1'), triple('f2', 'dima', 'replied', 'm2')]);
        expect(yield* brain.ask('replies(dima, N)')).toEqual([{ N: 2 }]);

        const result = yield* brain.push([
          triple('f3', 'dima', 'replied', 'm3'),
          triple('f4', 'rich', 'replied', 'm1'),
        ]);
        expect(result.mode).toBe('full');
        expect(yield* brain.ask('replies(X, N)')).toEqual([
          { X: 'dima', N: 3 },
          { X: 'rich', N: 1 },
        ]);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'answers conjunctive queries with joins, negation and built-ins',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.push([
          triple('f1', 'dima', 'works_on', 'indexer', { speaker: 'dima' }),
          triple('f2', 'dima', 'works_on', 'release', { speaker: 'rich' }),
        ]);
        expect(yield* brain.ask('fact(F, dima, works_on, W), speaker(F, dima)')).toEqual([{ F: 'f1', W: 'indexer' }]);
        expect(yield* brain.ask('fact(F, _, works_on, W), not speaker(F, dima)')).toEqual([{ F: 'f2', W: 'release' }]);
        expect(yield* Effect.flip(brain.ask('works_on(X'))).toBeInstanceOf(Rule.ParseError);
        expect(yield* Effect.flip(brain.ask('not fact(F, _, _, _)'))).toBeInstanceOf(Rule.InvalidRuleError);
      }, Effect.provide(TestLayer)),
    );
  });

  describe('stratified negation', () => {
    it.effect(
      'an open goal is one not achieved, and achieving it withdraws it',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.addRules({
          id: 'goals',
          rules: `
            goal(G) :- fact(_, G, is_a, goal).
            achieved(G) :- fact(_, G, status, achieved).
            open(G) :- goal(G), not achieved(G).
          `,
        });
        yield* brain.push([triple('f1', 'g1', 'is_a', 'goal'), triple('f2', 'g2', 'is_a', 'goal')]);
        expect(yield* brain.ask('open(G)')).toEqual([{ G: 'g1' }, { G: 'g2' }]);

        const result = yield* brain.push([triple('f3', 'g1', 'status', 'achieved')]);
        expect(result.mode).toBe('full');
        expect(yield* brain.ask('open(G)')).toEqual([{ G: 'g2' }]);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'rejects a program that recurses through negation or aggregation, keeping the old one',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.addRules({ id: 'base', rules: 'p(X) :- fact(_, X, is, p).' });
        yield* brain.push([triple('f1', 'a', 'is', 'p')]);

        const sources = [
          'q(X) :- p(X), not r(X). r(X) :- q(X).',
          'win(X) :- move(X, Y), not win(Y). move(X, Y) :- fact(_, X, move, Y).',
          'total(count(X)) :- total(X).',
        ];
        for (const rules of sources) {
          expect(yield* Effect.flip(brain.addRules({ id: 'bad', rules }))).toBeInstanceOf(Rule.StratificationError);
        }
        expect(yield* brain.ask('p(X)')).toEqual([{ X: 'a' }]);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'rejects unsafe rules, arity clashes and reserved heads',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        const sources = [
          'p(X, Y) :- fact(_, X, _, _).',
          'p(X) :- fact(_, X, _, _), not q(Y).',
          'p(X) :- fact(_, X, _, _), gt(Y, 1).',
          'p(_) :- fact(_, _, _, _).',
          'p(X) :- fact(X, _, _).',
          'p(X) :- q(X). p(X, Y) :- q(X), q(Y).',
          'fact(a, b, c, d).',
          'eq(a, b).',
          'p(X) :- q(X), contains(X).',
          'p(count(X), count(Y)) :- q(X), q(Y).',
          '! twice :- q(_). ! twice :- r(_).',
        ];
        for (const rules of sources) {
          expect(yield* Effect.flip(brain.addRules({ id: 'bad', rules })), rules).toBeInstanceOf(Rule.InvalidRuleError);
        }
      }, Effect.provide(TestLayer)),
    );
  });

  describe('incremental evaluation', () => {
    it.effect(
      'joins only new facts when the change is monotone, and agrees with a full evaluation',
      Effect.fnUntraced(function* () {
        const rules = `
          within(X, Y) :- fact(_, X, part_of, Y).
          within(X, Z) :- within(X, Y), fact(_, Y, part_of, Z).
        `;
        const facts = Array.from({ length: 12 }, (_, index) =>
          triple(`f${index}`, `n${index}`, 'part_of', `n${index + 1}`),
        );

        const incremental = yield* Brain.make();
        yield* incremental.addRules({ id: 'within', rules });
        const modes: Brain.Mode[] = [];
        const derived: number[] = [];
        for (const fact of facts) {
          const result = yield* incremental.push([fact]);
          modes.push(result.mode);
          derived.push(result.derived);
        }
        expect(new Set(modes)).toEqual(new Set(['incremental']));
        // Appending the n-th link derives exactly the n new paths that end at it.
        expect(derived).toEqual(facts.map((_, index) => index + 1));

        const full = yield* Brain.make();
        yield* full.push(facts);
        const evaluation = yield* full.addRules({ id: 'within', rules });
        expect(evaluation.mode).toBe('full');
        expect(evaluation.derived).toBe((12 * 13) / 2);
        const sorted = (rows: readonly Readonly<Record<string, Rule.Value>>[]) =>
          rows.map((row) => JSON.stringify(row)).sort();
        expect(sorted(yield* incremental.ask('within(X, Y)'))).toEqual(sorted(yield* full.ask('within(X, Y)')));
      }),
    );

    it.effect(
      'a push that changes nothing is not evaluated',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.addRules({ id: 'r', rules: 'p(X) :- fact(_, X, _, _).' });
        yield* brain.push([triple('f1', 'a', 'b', 'c')]);
        const again = yield* brain.push([triple('f1', 'a', 'b', 'c')]);
        expect(again).toEqual({ events: [], mode: 'none', derived: 0, added: [], duplicates: ['f1'] });
      }, Effect.provide(TestLayer)),
    );
  });

  describe('idempotence and conflicts', () => {
    it.effect(
      'pushing the same facts twice stores them once and emits nothing',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.addRules({ id: 'r', rules: 'knows(X, Y) :- fact(_, X, knows, Y).' });
        const input = { subject: { entity: 'rich' }, predicate: 'knows', object: { entity: 'dima' } };
        const first = yield* brain.push([input, input]);
        expect(first.added).toHaveLength(1);
        expect(first.duplicates).toEqual(first.added);

        const second = yield* brain.push([input]);
        expect(second.added).toEqual([]);
        expect(second.events).toEqual([]);
        expect(yield* brain.query()).toHaveLength(1);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'a reused id with different content is a conflict and changes nothing',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.push([triple('f1', 'a', 'is', 'b')]);
        const error = yield* Effect.flip(brain.push([triple('f2', 'x', 'is', 'y'), triple('f1', 'a', 'is', 'c')]));
        expect(error).toBeInstanceOf(Brain.ConflictError);
        expect((yield* brain.query()).map(({ id }) => id)).toEqual(['f1']);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'an invalid fact fails the whole batch',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        const error = yield* Effect.flip(
          brain.push([triple('f1', 'a', 'is', 'b'), { subject: {}, predicate: 'is', object: { entity: 'c' } }]),
        );
        expect(error).toBeInstanceOf(Fact.ValidationError);
        expect(yield* brain.query()).toEqual([]);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'addRules with the same text is a no-op',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        const ruleset = { id: 'r', rules: 'p(X) :- fact(_, X, _, _).' };
        yield* brain.push([triple('f1', 'a', 'b', 'c')]);
        expect((yield* brain.addRules(ruleset)).events).toHaveLength(1);
        expect(yield* brain.addRules(ruleset)).toEqual({ events: [], mode: 'none', derived: 0 });
      }, Effect.provide(TestLayer)),
    );
  });

  describe('retraction and truth maintenance', () => {
    it.effect(
      'retracting a fact withdraws what only it supported',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.addRules({
          id: 'r',
          rules: 'busy(X) :- fact(_, X, works_on, _). overloaded(X) :- busy(X), fact(_, X, on_call, _).',
        });
        yield* brain.push([triple('f1', 'dima', 'works_on', 'indexer'), triple('f2', 'dima', 'on_call', 'week')]);
        expect(yield* brain.ask('overloaded(X)')).toEqual([{ X: 'dima' }]);

        const result = yield* brain.retract(['f1']);
        expect(result.retracted).toEqual(['f1']);
        expect(result.mode).toBe('full');
        expect(yield* brain.ask('busy(X)')).toEqual([]);
        expect(yield* brain.ask('overloaded(X)')).toEqual([]);
        expect(yield* brain.query()).toHaveLength(1);
        expect(yield* brain.query({}, { inactive: true })).toHaveLength(2);

        // Retracting again is a no-op; retracting an unknown id is an error.
        expect((yield* brain.retract(['f1'])).retracted).toEqual([]);
        expect(yield* Effect.flip(brain.retract(['nope']))).toBeInstanceOf(Fact.ValidationError);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'a conclusion with another derivation survives, and its provenance moves to it',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.addRules({ id: 'r', rules: 'busy(X) :- fact(_, X, works_on, _).' });
        yield* brain.push([triple('f1', 'dima', 'works_on', 'indexer'), triple('f2', 'dima', 'works_on', 'release')]);
        const before = yield* brain.explain({ predicate: 'busy', args: ['dima'] });
        expect(Option.map(before, Brain.supportingFacts)).toEqual(Option.some(['f1']));

        const result = yield* brain.retract(['f1']);
        expect(result.events).toHaveLength(1);
        expect(yield* brain.ask('busy(dima)')).toEqual([{}]);
        const after = yield* brain.explain({ predicate: 'busy', args: ['dima'] });
        expect(Option.map(after, Brain.supportingFacts)).toEqual(Option.some(['f2']));
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'a correction supersedes the fact it corrects',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.addRules({ id: 'r', rules: 'ships_on(X, D) :- fact(_, X, ships_on, D).' });
        yield* brain.push([triple('f1', 'release', 'ships_on', 'friday')]);
        const correction = yield* brain.push([triple('f2', 'release', 'ships_on', 'monday', { supersedes: ['f1'] })]);

        expect(yield* brain.ask('ships_on(release, D)')).toEqual([{ D: 'monday' }]);
        expect((yield* brain.query()).map(({ id }) => id)).toEqual(['f2']);
        expect(correction.mode).toBe('full');
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'a correction that arrives before the fact it corrects still wins',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.push([triple('f2', 'release', 'ships_on', 'monday', { supersedes: ['f1'] })]);
        const late = yield* brain.push([triple('f1', 'release', 'ships_on', 'friday')]);
        expect(late.added).toEqual(['f1']);
        expect(late.events).toEqual([]);
        expect((yield* brain.query()).map(({ id }) => id)).toEqual(['f2']);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'removing a ruleset withdraws its conclusions',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.addRules({ id: 'a', rules: 'p(X) :- fact(_, X, _, _).' });
        yield* brain.addRules({ id: 'b', rules: 'q(X) :- p(X).' });
        yield* brain.push([triple('f1', 'x', 'y', 'z')]);
        expect(yield* brain.removeRules('a')).toBe(true);
        expect(yield* brain.ask('q(X)')).toEqual([]);
        expect(yield* brain.removeRules('a')).toBe(false);
      }, Effect.provide(TestLayer)),
    );
  });

  describe('time', () => {
    it.effect(
      'facts expire at validTo when the clock is read again',
      Effect.fnUntraced(function* () {
        yield* TestClock.setTime(MONDAY);
        const brain = yield* Brain.make();
        yield* brain.addRules({ id: 'r', rules: 'away(X) :- fact(_, X, status, away).' });
        yield* brain.push([triple('f1', 'dima', 'status', 'away', { validTo: new Date(MONDAY + DAY).toISOString() })]);
        expect(yield* brain.ask('away(X)')).toEqual([{ X: 'dima' }]);

        yield* TestClock.adjust('1 day');
        const tick = yield* brain.tick();
        expect(tick.mode).toBe('full');
        expect(yield* brain.ask('away(X)')).toEqual([]);
        expect(yield* brain.query({}, { inactive: true })).toHaveLength(1);
      }),
    );

    it.effect(
      'rules that read time re-evaluate as the clock advances',
      Effect.fnUntraced(function* () {
        yield* TestClock.setTime(MONDAY);
        const brain = yield* Brain.make();
        yield* brain.addRules({ id: 'r', rules: 'stale(F) :- fact(F, _, _, _), said_at(F, T), elapsed(T, 2d).' });
        yield* brain.push([triple('f1', 'dima', 'said', 'hi', { saidAt: new Date(MONDAY).toISOString() })]);
        expect((yield* brain.tick()).events).toEqual([]);

        yield* TestClock.adjust('47 hours');
        expect(yield* brain.ask('stale(F)')).toEqual([]);
        yield* brain.tick();
        expect(yield* brain.ask('stale(F)')).toEqual([]);

        yield* TestClock.adjust('1 hour');
        expect((yield* brain.tick()).events).toHaveLength(1);
        expect(yield* brain.ask('stale(F)')).toEqual([{ F: 'f1' }]);
      }),
    );
  });

  describe('provenance', () => {
    it.effect(
      'explain traces a derived atom through its rules to the facts',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.addRules({
          id: 'family',
          rules: `
            parent(X, Y) :- fact(_, X, parent_of, Y).
            grandparent(X, Z) :- parent(X, Y), parent(Y, Z).
          `,
        });
        yield* brain.push([triple('f1', 'ann', 'parent_of', 'bea'), triple('f2', 'bea', 'parent_of', 'cid')]);

        const proof = Option.getOrThrow(yield* brain.explain({ predicate: 'grandparent', args: ['ann', 'cid'] }));
        expect(proof).toMatchObject({
          _tag: 'rule',
          rule: 'family#2',
          text: 'grandparent(X, Z) :- parent(X, Y), parent(Y, Z).',
          premises: [
            { _tag: 'rule', rule: 'family#1', atom: { predicate: 'parent', args: ['ann', 'bea'] } },
            { _tag: 'rule', rule: 'family#1', atom: { predicate: 'parent', args: ['bea', 'cid'] } },
          ],
        });
        expect(Brain.supportingFacts(proof)).toEqual(['f1', 'f2']);
        expect(yield* brain.explain({ predicate: 'grandparent', args: ['cid', 'ann'] })).toEqual(Option.none());
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'derived events carry the rule and premises that produced them',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.addRules({ id: 'r', rules: 'busy(X) :- fact(F, X, works_on, _), speaker(F, X).' });
        yield* brain.register('watcher');
        yield* brain.subscribe('watcher', { selector: { _tag: 'atoms', predicate: 'busy' } });
        yield* brain.push([triple('f1', 'dima', 'works_on', 'indexer', { speaker: 'dima' })]);

        const [delivery] = yield* brain.take('watcher');
        expect(delivery.event).toMatchObject({
          kind: 'derived',
          atom: { predicate: 'busy', args: ['dima'] },
          derivation: {
            _tag: 'rule',
            rule: 'r#1',
            premises: [
              { predicate: 'fact', args: ['f1', 'dima', 'works_on', 'indexer'] },
              { predicate: 'speaker', args: ['f1', 'dima'] },
            ],
          },
        });
      }, Effect.provide(TestLayer)),
    );
  });

  describe('consistency', () => {
    const CONTRADICTION = `
      ! contradiction :- fact(A, S, P, O), polarity(A, "+"), fact(B, S, P, O), polarity(B, "-").
    `;

    it.effect(
      'a flagged constraint reports a contradiction and its resolution',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.addRules({ id: 'consistency', rules: CONTRADICTION, onViolation: 'flag' });
        yield* brain.register('auditor');
        yield* brain.subscribe('auditor', { selector: { _tag: 'violations', kinds: ['violated', 'resolved'] } });

        yield* brain.push([triple('f1', 'dima', 'will_help', 'rich', { speaker: 'rich' })]);
        yield* brain.push([triple('f2', 'dima', 'will_help', 'rich', { speaker: 'dima', polarity: '-' })]);
        expect(yield* brain.violations()).toEqual([
          { constraint: 'contradiction', bindings: { A: 'f1', B: 'f2', S: 'dima', P: 'will_help', O: 'rich' } },
        ]);

        yield* brain.retract(['f1']);
        expect(yield* brain.violations()).toEqual([]);
        const deliveries = yield* brain.take('auditor');
        expect(deliveries.map(({ event }) => event.kind)).toEqual(['violated', 'resolved']);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'a reject constraint refuses the push atomically',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.addRules({ id: 'consistency', rules: CONTRADICTION });
        yield* brain.register('watcher');
        yield* brain.subscribe('watcher', { selector: { _tag: 'facts', pattern: {} } });
        yield* brain.push([triple('f1', 'sky', 'is', 'blue')]);

        const error = yield* Effect.flip(
          brain.push([triple('f2', 'grass', 'is', 'green'), triple('f3', 'sky', 'is', 'blue', { polarity: '-' })]),
        );
        expect(error).toBeInstanceOf(Brain.ConsistencyError);
        expect(error.context).toMatchObject({ violations: [{ constraint: 'contradiction' }] });
        expect((yield* brain.query()).map(({ id }) => id)).toEqual(['f1']);
        expect(yield* brain.take('watcher')).toHaveLength(1);
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'a ruleset that the facts already violate is refused',
      Effect.fnUntraced(function* () {
        const brain = yield* Brain.Brain;
        yield* brain.push([triple('f1', 'sky', 'is', 'blue'), triple('f2', 'sky', 'is', 'blue', { polarity: '-' })]);
        expect(yield* Effect.flip(brain.addRules({ id: 'consistency', rules: CONTRADICTION }))).toBeInstanceOf(
          Brain.ConsistencyError,
        );
        const flagged = yield* brain.addRules({ id: 'consistency', rules: CONTRADICTION, onViolation: 'flag' });
        expect(flagged.events).toHaveLength(1);
        expect(yield* brain.violations()).toHaveLength(1);
      }, Effect.provide(TestLayer)),
    );
  });

  describe('determinism', () => {
    it.effect(
      'the same operations produce the same events',
      Effect.fnUntraced(function* () {
        const run = Effect.fnUntraced(function* () {
          const brain = yield* Brain.make();
          yield* brain.register('r');
          yield* brain.subscribe('r', {
            selector: { _tag: 'atoms', predicate: 'within', kinds: ['derived', 'underived'] },
          });
          yield* brain.addRules({
            id: 'within',
            rules: 'within(X, Y) :- fact(_, X, part_of, Y). within(X, Z) :- within(X, Y), within(Y, Z).',
          });
          yield* brain.push([triple('f1', 'a', 'part_of', 'b'), triple('f2', 'b', 'part_of', 'c')]);
          yield* brain.push([triple('f3', 'c', 'part_of', 'd')]);
          yield* brain.retract(['f2']);
          return yield* brain.take('r');
        });
        const first: Event.Delivery[] = yield* run();
        expect(first.map(({ event }) => event.kind)).toEqual([
          ...Array(6).fill('derived'),
          ...Array(4).fill('underived'),
        ]);
        expect(yield* run()).toEqual(first);
      }),
    );
  });
});

/** A fact input with entity terms, the shape most of these scenarios need. */
const triple = (
  id: string,
  subject: string,
  predicate: string,
  object: string,
  extra: Partial<Fact.Input> = {},
): Fact.Input => ({ id, subject: { entity: subject }, predicate, object: { entity: object }, ...extra });
