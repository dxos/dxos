//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type RDF } from '@dxos/pipeline-rdf';

import * as Compiler from './Compiler.ts';
import * as Evaluator from './Evaluator.ts';
import { REFERENCE, SCENARIOS, simulate, toFact } from './testing/index.ts';

const START = '2027-01-04T09:00:00.000Z';
const minutes = (count: number): number => Date.parse(START) + count * 60_000;

const said = (id: string, speaker: string, quote: string, at: number): RDF.Fact =>
  toFact(
    {
      id,
      speaker,
      quote,
      s: speaker,
      p: 'says',
      o: 'x',
      force: 'assertive',
      polarity: '+',
      mood: 'declarative',
      source: 'chat:general',
      factuality: 'CT+',
    },
    new Date(at).toISOString(),
  );

const watchDima: Evaluator.Subscription = {
  id: 'watch',
  rules: 'wake(dima) :- speaker(F, dima), saidAt(F, T), T >= "2027-01-04T09:00:00.000Z".',
  createdAt: START,
};

describe('Evaluator', () => {
  test('queues one event per new binding, with the facts behind it', ({ expect }) => {
    const evaluator = Evaluator.make();
    evaluator.add(watchDima);
    const fact = said('f1', 'dima', 'I am on the indexer', minutes(1));

    const events = evaluator.push([fact, said('f2', 'rich', 'Hello', minutes(1))], { at: minutes(1) });
    expect(events).toEqual([
      {
        id: Evaluator.eventId('watch', 'dima', ['f1'], minutes(1)),
        subscription: 'watch',
        label: 'dima',
        cause: 'rule',
        facts: [fact],
        at: minutes(1),
      },
    ]);
    // The same fact again is no new binding.
    expect(evaluator.push([fact], { at: minutes(2) })).toEqual([]);
  });

  test('quiet speakers are evaluated but wake nothing on their own', ({ expect }) => {
    const evaluator = Evaluator.make();
    evaluator.add({ id: 'any', rules: 'wake(any) :- fact(F, _, _, _).', createdAt: START });
    expect(
      evaluator.push([said('own', 'kai', 'Dima is on it', minutes(1))], { at: minutes(1), quiet: ['kai'] }),
    ).toEqual([]);
    expect(
      evaluator.push([said('f1', 'dima', 'I am on it', minutes(2))], { at: minutes(2), quiet: ['kai'] }),
    ).toHaveLength(1);
  });

  test('a subscription added later reads history but wakes only on what follows', ({ expect }) => {
    const evaluator = Evaluator.make();
    evaluator.push([said('old', 'dima', 'Earlier', minutes(1))], { at: minutes(1) });
    evaluator.add({
      id: 'count',
      rules: 'wake(second) :- N = count : { speaker(_, dima) }, N >= 2.',
      createdAt: START,
    });
    const events = evaluator.push([said('new', 'dima', 'Later', minutes(2))], { at: minutes(2) });
    expect(events.map(({ label }) => label)).toEqual(['second']);
  });

  test('hydrate re-derives state silently; the next push wakes only on new facts', ({ expect }) => {
    const history = [said('f1', 'dima', 'One', minutes(1)), said('f2', 'dima', 'Two', minutes(2))];
    const evaluator = Evaluator.make();
    evaluator.hydrate([watchDima], history, minutes(3));
    expect(evaluator.subscriptions.map(({ id }) => id)).toEqual(['watch']);
    expect(evaluator.push(history, { at: minutes(4) })).toEqual([]);
    expect(evaluator.push([said('f3', 'dima', 'Three', minutes(5))], { at: minutes(5) }).map(({ id }) => id)).toEqual([
      Evaluator.eventId('watch', 'dima', ['f3'], minutes(5)),
    ]);
  });

  test('ticks fire time-driven wakes, and report when the clock next matters', ({ expect }) => {
    const evaluator = Evaluator.make();
    evaluator.add({ id: 'daily', rules: 'wake(practice) :- every(1d).', createdAt: START });
    evaluator.add({ id: 'followup', rules: 'wake(followup) :- elapsed(goal, 2d).', createdAt: START });
    expect(evaluator.nextDueAt()).toBe(minutes(24 * 60));

    expect(evaluator.tick(minutes(60))).toEqual([]);
    const day = evaluator.tick(minutes(24 * 60 + 1));
    expect(day.map(({ label, cause, facts }) => ({ label, cause, facts }))).toEqual([
      { label: 'practice', cause: 'rule', facts: [] },
    ]);
    expect(day[0].id).toBe(Evaluator.eventId('daily', 'practice', [], minutes(24 * 60 + 1)));
    expect(evaluator.nextDueAt()).toBe(minutes(2 * 24 * 60));
    expect(
      evaluator
        .tick(minutes(2 * 24 * 60))
        .map(({ label }) => label)
        .sort(),
    ).toEqual(['followup', 'practice']);
  });

  test('nextDueAt covers due deadlines and facts that start their own clock', ({ expect }) => {
    const evaluator = Evaluator.make();
    evaluator.add({ id: 'tax', rules: 'wake(remind) :- due("2027-01-10T00:00:00Z", 1d).', createdAt: START });
    expect(evaluator.nextDueAt()).toBe(Date.parse('2027-01-09T00:00:00Z'));
    evaluator.remove('tax');
    expect(evaluator.nextDueAt()).toBeUndefined();

    evaluator.add({ id: 'stale', rules: 'wake(stale) :- speaker(F, dima), elapsed(F, 1h).', createdAt: START });
    evaluator.push([said('f1', 'dima', 'Will do', minutes(10))], { at: minutes(10) });
    expect(evaluator.nextDueAt()).toBe(minutes(70));
  });

  test('rules that do not compile are refused and leave the evaluator unchanged', ({ expect }) => {
    const evaluator = Evaluator.make();
    expect(() => evaluator.add({ id: 'bad', rules: 'wake(x) :- helpz_with(dima, X).', createdAt: START })).toThrow(
      Compiler.CompileError,
    );
    expect(evaluator.has('bad')).toBe(false);
  });

  describe('wakes as GoalRules does for the example goals', () => {
    // Goals 5 and 7 drive sub-goals and actions, which a subscription does not carry.
    const plain = SCENARIOS.filter(({ n }) => n !== 5 && n !== 7);
    test.for(plain.map(({ n, goal }) => [n, goal] as const))('goal %i: %s', ([number], { expect }) => {
      const scenario = SCENARIOS.find(({ n }) => n === number);
      expect(scenario).toBeDefined();
      if (!scenario) {
        return;
      }
      const reference = simulate(scenario, REFERENCE[number]);
      const evaluator = Evaluator.make();
      evaluator.add({ id: `goal-${number}`, rules: REFERENCE[number], createdAt: scenario.createdAt });
      const woke = scenario.steps.map(
        (step) =>
          evaluator.push(
            (step.facts ?? []).map((fact) => toFact(fact, step.at)),
            { at: Date.parse(step.at) },
          ).length > 0,
      );
      expect(woke).toEqual(reference.steps.map(({ wake }) => wake));
    });
  });
});
