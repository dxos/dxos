//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Trigger } from '#types';

import { AGENT, BOB, FACTS, label, makeSnapshot } from '../components/BrainStore/testing.ts';
import * as BrainInspection from './BrainInspection.ts';

describe('BrainInspection', () => {
  test('lists facts newest first, naming speakers', ({ expect }) => {
    const { facts } = BrainInspection.make(makeSnapshot(), { label });
    expect(facts.map(({ id }) => id)).toEqual(['fact-3', 'fact-2', 'fact-1']);
    expect(facts[1]).toMatchObject({ text: 'Bob opened indexer PR', speaker: 'Bob', fact: FACTS[1] });
  });

  test('a subscription shows its own rules, else its pattern translated', ({ expect }) => {
    const snapshot = makeSnapshot();
    const [translated, compiled] = BrainInspection.make(snapshot, { label }).subscriptions;
    expect(translated).toMatchObject({
      id: `${AGENT}.watch-bob`,
      when: 'Bob · about "indexer"',
      compiled: false,
      ongoing: true,
      rules: Trigger.toRules({ speaker: BOB, about: 'indexer' }, { createdAt: '2026-10-07T09:00:00.000Z' }),
    });
    expect(compiled).toMatchObject({ compiled: true, ongoing: false, rules: snapshot.subscriptions[1].trigger.rules });
  });

  test('encodes facts as the Datalog relations the rules match', ({ expect }) => {
    const { encoding } = BrainInspection.make(makeSnapshot());
    expect(encoding.map(({ id }) => id)).toEqual(['fact-3', 'fact-2', 'fact-1']);
    const lines = encoding[1].lines;
    expect(lines[0]).toBe(`fact("fact-2", "${BOB}", opened, "indexer PR").`);
    expect(lines).toContain(`speaker("fact-2", "${BOB}").`);
    expect(lines).toContain('force("fact-2", commissive).');
    expect(lines).toContain('saidAt("fact-2", "2026-10-07T11:45:00.000Z").');
  });

  test('derives outbox stats across subscriptions', ({ expect }) => {
    const { subscriptions, stats } = BrainInspection.make(makeSnapshot());
    expect(subscriptions[0].pending).toEqual([
      { id: 'event-1', label: 'match', at: '2026-10-07T10:30:01.000Z', facts: ['fact-1'] },
      { id: 'event-2', label: 'match', at: '2026-10-07T11:45:01.000Z', facts: ['fact-2'] },
    ]);
    expect(stats).toEqual({
      facts: 3,
      subscriptions: 2,
      pending: 2,
      oldestPendingAt: '2026-10-07T10:30:01.000Z',
      nextDueAt: '2026-10-08T09:00:00.000Z',
    });
  });

  test('an empty brain has no pending or due times', ({ expect }) => {
    expect(BrainInspection.make({ facts: [], subscriptions: [] }).stats).toEqual({
      facts: 0,
      subscriptions: 0,
      pending: 0,
    });
  });
});
