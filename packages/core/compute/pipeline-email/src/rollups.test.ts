//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Message } from '@dxos/types';

import { buildRollups } from './rollups';

describe('buildRollups', () => {
  test('aggregates per sender: counts, contact span, cadence, threads', ({ expect }) => {
    const rollups = buildRollups([
      msg('Q2 report', 'Alice@Enron.com', '2001-05-01T10:00:00.000Z'),
      msg('RE: Q2 report', 'alice@enron.com', '2001-05-03T10:00:00.000Z'),
      msg('Budget', 'alice@enron.com', '2001-05-05T10:00:00.000Z'),
      msg('Lunch', 'bob@enron.com', '2001-05-02T10:00:00.000Z'),
    ]);

    expect(rollups).toHaveLength(2);
    // Sorted by message count, so alice first; mixed casing folds into one sender.
    const [alice, bob] = rollups;
    expect(alice.email).toBe('alice@enron.com');
    expect(alice.messageCount).toBe(3);
    expect(alice.firstContact).toBe('2001-05-01T10:00:00.000Z');
    expect(alice.lastContact).toBe('2001-05-05T10:00:00.000Z');
    expect(alice.cadenceDays).toBe(2);
    expect(alice.threadIds).toEqual(['q2 report', 'budget']);

    expect(bob.messageCount).toBe(1);
    expect(bob.cadenceDays).toBeUndefined();
  });

  test('skips messages without a sender email', ({ expect }) => {
    const anonymous = Message.make({
      created: '2001-05-01T10:00:00.000Z',
      sender: { name: 'Mystery' },
      blocks: [{ _tag: 'text', text: 'body' }],
    });
    expect(buildRollups([anonymous])).toHaveLength(0);
  });
});

const msg = (subject: string, from: string, created: string) =>
  Message.make({
    created,
    sender: { email: from },
    blocks: [{ _tag: 'text', text: 'body' }],
    properties: { subject, messageId: `<${from}:${created}>` },
  });
