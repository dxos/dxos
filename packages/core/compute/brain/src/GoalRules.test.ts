//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

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

  test('rejects input past the fact and sub-goal caps without applying it', ({ expect }) => {
    const rules = GoalRules.make({
      source: 'wake(reply) :- speaker(F, dima), about(F, "plugin").',
      createdAt: 0,
      maxFacts: 2,
      maxSubgoals: 1,
    });
    const saidAt = new Date(1).toISOString();
    const fact = (id: string, quote: string) =>
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
      );

    rules.update({ at: 1, facts: [fact('f1', 'lunch?'), fact('f2', 'coffee?')] });
    expect(rules.update({ at: 2, facts: [fact('f1', 'lunch?')] }).wakes).toEqual([]);
    expect(() => rules.update({ at: 3, facts: [fact('f3', 'the plugin is ready')] })).toThrow(GoalRules.CapacityError);
    expect(rules.update({ at: 4 }).wakes).toEqual([]);

    rules.update({ at: 5, subgoals: { first: 'active' } });
    expect(() => rules.update({ at: 6, subgoals: { second: 'active' } })).toThrow(GoalRules.CapacityError);
    expect(rules.update({ at: 7, subgoals: { first: 'done' } }).wakes).toEqual([
      { label: 'first', cause: 'subgoal', facts: [] },
    ]);
  });
});
