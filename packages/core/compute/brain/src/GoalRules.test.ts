//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type RDF } from '@dxos/pipeline-rdf';

import * as GoalRules from './GoalRules.ts';
import { REFERENCE, SCENARIOS, WRONG, simulate, toFact } from './testing/index.ts';

describe('GoalRules', () => {
  describe('example goals replay against their reference compilations', () => {
    test.for(SCENARIOS.map((scenario) => [scenario.n, scenario.goal] as const))(
      'goal %i: %s',
      ([number], { expect }) => {
        const scenario = SCENARIOS.find((candidate) => candidate.n === number);
        expect(scenario).toBeDefined();
        if (scenario) {
          const result = simulate(scenario, REFERENCE[number]);
          expect(result.failures).toEqual([]);
        }
      },
    );
  });

  describe('replay rejects wrong compilations', () => {
    test.for(WRONG.map(({ scenario, note, source }) => [scenario, note, source] as const))(
      'goal %i: %s',
      ([number, , source], { expect }) => {
        const scenario = SCENARIOS.find((candidate) => candidate.n === number);
        expect(scenario).toBeDefined();
        if (scenario) {
          const result = simulate(scenario, source);
          expect(result.steps).toHaveLength(scenario.steps.length);
          expect(result.failures.length).toBeGreaterThan(0);
        }
      },
    );
  });

  test('wakes once per new binding and reports the facts behind it', ({ expect }) => {
    const createdAt = Date.parse('2027-01-04T09:00:00Z');
    const rules = GoalRules.make({ source: 'wake(reply) :- speaker(F, dima), about(F, "plugin").', createdAt });
    const say = (id: string, quote: string, minutes: number) => {
      const saidAt = new Date(createdAt + minutes * 60_000).toISOString();
      return rules.update({
        at: Date.parse(saidAt),
        facts: [
          toFact(
            {
              id,
              speaker: 'dima',
              quote,
              s: 'dima',
              p: 'says',
              o: 'x',
              force: 'assertive',
              polarity: '+',
              mood: 'declarative',
              source: 'chat',
              factuality: 'CT+',
            },
            saidAt,
          ),
        ],
      });
    };

    expect(say('f1', 'the plugin is ready', 1).wakes).toEqual([{ label: 'reply', cause: 'rule', facts: ['f1'] }]);
    expect(say('f2', 'lunch?', 2).wakes).toEqual([]);
    expect(say('f3', 'plugin docs too', 3).wakes).toEqual([{ label: 'reply', cause: 'rule', facts: ['f3'] }]);
  });

  test('wakes when achieved first holds and when a sub-goal changes status', ({ expect }) => {
    const rules = GoalRules.make({
      source:
        'achieved(goal) :- subgoal(goal, G), status(G, done), not open.\nopen :- subgoal(goal, G), status(G, active).',
      createdAt: 0,
    });
    expect(rules.update({ at: 1, subgoals: { first: 'active', second: 'done' } }).wakes).toEqual([]);
    const evaluation = rules.update({ at: 2, subgoals: { first: 'done', second: 'done' } });
    expect(evaluation.achieved).toBe(true);
    expect(evaluation.wakes.map(({ label, cause }) => [label, cause])).toEqual([
      ['first', 'subgoal'],
      ['achieved', 'achieved'],
    ]);
    expect(rules.update({ at: 3 }).wakes).toEqual([]);
  });

  test('checks proposed actions without keeping them', ({ expect }) => {
    const rules = GoalRules.make({ source: REFERENCE[7], createdAt: 0 });
    const friday = { id: 'a1', kind: 'book_meeting', args: { start: '2027-01-08T15:00:00Z' } };
    expect(rules.checkAction(friday).blocked).toBe(true);
    expect(rules.checkAction({ ...friday, id: 'a2', args: { start: '2027-01-05T10:00:00Z' } }).blocked).toBe(false);
    expect(rules.checkAction(friday).blocked).toBe(true);
  });

  describe('working memory', () => {
    const DAY = 86_400_000;
    const said = (id: string, object: string, day: number, validTo?: string): RDF.Fact => {
      const fact = toFact(
        {
          id,
          speaker: 'dima',
          quote: object,
          s: 'dima',
          p: 'says',
          o: object,
          force: 'assertive',
          polarity: '+',
          mood: 'declarative',
          source: 'chat',
          factuality: 'CT+',
        },
        new Date(day * DAY).toISOString(),
      );
      return validTo === undefined ? fact : { ...fact, assertion: { ...fact.assertion, validTo } };
    };

    test('retires the oldest facts past the cap instead of rejecting them', ({ expect }) => {
      const rules = GoalRules.make({ source: 'holds(goal) :- fact(_, dima, says, a).', createdAt: 0, maxFacts: 2 });
      expect(rules.update({ at: 1 * DAY, facts: [said('f1', 'a', 1)] }).holds).toBe(true);
      expect(rules.update({ at: 2 * DAY, facts: [said('f2', 'b', 2)] }).holds).toBe(true);
      // A re-sent fact is already in working memory and does not count again.
      expect(rules.update({ at: 3 * DAY, facts: [said('f1', 'a', 1)] }).holds).toBe(true);
      expect(rules.update({ at: 4 * DAY, facts: [said('f3', 'c', 4)] }).holds).toBe(false);
      // A late arrival said before everything kept is itself the oldest, so it retires at once.
      expect(rules.update({ at: 5 * DAY, facts: [said('f4', 'a', 0)] }).holds).toBe(false);
    });

    test('retires facts once the clock passes their validTo', ({ expect }) => {
      const rules = GoalRules.make({ source: 'holds(goal) :- fact(_, dima, says, a).', createdAt: 0 });
      const validTo = new Date(3 * DAY).toISOString();
      const first = rules.update({ at: 1 * DAY, facts: [said('f1', 'a', 1, validTo)] });
      expect(first.holds).toBe(true);
      expect(rules.update({ at: 2 * DAY }).holds).toBe(true);
      expect(rules.update({ at: 4 * DAY })).toEqual({ at: 4 * DAY, wakes: [], achieved: false, holds: false });
      expect(rules.update({ at: 5 * DAY, facts: [said('f2', 'a', 5, validTo)] }).holds).toBe(false);
    });

    test('retiring a fact does not wake the goal', ({ expect }) => {
      const rules = GoalRules.make({
        source: 'wake(gap) :- not seen.\nseen :- fact(_, dima, says, b).',
        createdAt: 0,
        maxFacts: 1,
      });
      rules.update({ at: 1 * DAY, facts: [said('f1', 'b', 1)] });
      expect(rules.update({ at: 2 * DAY, facts: [said('f2', 'c', 2)] }).wakes).toEqual([]);
      expect(rules.update({ at: 3 * DAY }).wakes).toEqual([]);
    });

    test('keeps the facts behind achieved, so retirement never un-achieves the goal', ({ expect }) => {
      const rules = GoalRules.make({
        source: 'achieved(goal) :- fact(_, dima, says, a).',
        createdAt: 0,
        maxFacts: 1,
      });
      const validTo = new Date(2 * DAY).toISOString();
      expect(rules.update({ at: 1 * DAY, facts: [said('f1', 'a', 1, validTo)] }).wakes).toEqual([
        { label: 'achieved', cause: 'achieved', facts: ['f1'] },
      ]);
      expect(rules.update({ at: 3 * DAY, facts: [said('f2', 'b', 3)] })).toEqual({
        at: 3 * DAY,
        wakes: [],
        achieved: true,
        holds: false,
      });
    });

    test('rejects sub-goals past the cap without applying them', ({ expect }) => {
      const rules = GoalRules.make({
        source:
          'achieved(goal) :- subgoal(goal, G), status(G, done), not open.\nopen :- subgoal(goal, G), status(G, active).',
        createdAt: 0,
        maxSubgoals: 1,
      });
      rules.update({ at: 1, subgoals: { first: 'active' } });
      expect(() => rules.update({ at: 2, subgoals: { second: 'active' } })).toThrow(GoalRules.CapacityError);
      expect(rules.update({ at: 3, subgoals: { first: 'done' } }).wakes).toEqual([
        { label: 'first', cause: 'subgoal', facts: [] },
        { label: 'achieved', cause: 'achieved', facts: [] },
      ]);
    });
  });
});
