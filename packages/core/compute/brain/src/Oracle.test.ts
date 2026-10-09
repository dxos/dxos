//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Oracle from './Oracle.ts';
import { REFERENCE } from './testing/index.ts';

const CREATED = Date.parse('2027-01-04T09:00:00Z');

/** A timeline for goal 1 ("keep me informed about what Dima is working on"), as an oracle might write it. */
const TIMELINE = JSON.stringify({
  steps: [
    {
      after: '10m',
      says: [
        {
          speaker: 'rich',
          quote: 'Lunch?',
          subject: 'rich',
          predicate: 'suggests',
          object: 'lunch',
          force: 'directive',
        },
      ],
      wake: false,
      note: 'unrelated, and not Dima',
    },
    {
      after: '1h',
      says: [
        { speaker: 'dima', quote: 'I am on the indexer.', subject: 'dima', predicate: 'works on', object: 'indexer' },
      ],
      wake: true,
    },
  ],
});

describe('Oracle', () => {
  test('parses a timeline, also inside a code fence', ({ expect }) => {
    const reply = Oracle.parseReply(`Here it is:\n\`\`\`json\n${TIMELINE}\n\`\`\``);
    expect(reply.steps.map(({ wake }) => wake)).toEqual([false, true]);
    expect(() => Oracle.parseReply('no json')).toThrow(Oracle.ReplyError);
    expect(() => Oracle.parseReply('{"steps":[]}')).toThrow(Oracle.ReplyError);
  });

  test('passes a compilation that replays the timeline and fails one that does not', ({ expect }) => {
    const { steps } = Oracle.parseReply(TIMELINE);
    expect(Oracle.replay(REFERENCE[1], { createdAt: CREATED, steps })).toEqual({ ok: true, failures: [] });

    // Waking on anyone at all wakes on the near miss.
    const loose = Oracle.replay('wake(any) :- fact(F, _, _, _).', { createdAt: CREATED, steps });
    expect(loose.ok).toBe(false);
    expect(loose.failures).toEqual([
      expect.stringContaining('step 1 (unrelated, and not Dima): wake=true, expected false'),
    ]);

    // Rules that do not compile fail the gate rather than throw.
    expect(Oracle.replay('wake(x) :- nonsense(', { createdAt: CREATED, steps }).ok).toBe(false);
  });

  test('tells the oracle the ids people go by', ({ expect }) => {
    const message = Oracle.userMessage({
      goal: 'Keep me posted on Bob',
      owner: 'did:halo:ALICE',
      people: [{ name: 'Bob', id: 'did:halo:BOB' }],
    });
    expect(message).toContain('Bob = did:halo:BOB');
  });
});
