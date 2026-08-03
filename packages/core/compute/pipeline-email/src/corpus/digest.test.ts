//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Message } from '@dxos/types';

import { buildThreads } from '../internal/threads';
import { buildDigest, narrateDigest, renderDigest } from './digest';
import { type Commitment } from './ledger';
import { buildRollups } from './rollups';
import { clusterThreads } from './topics';

const OWNER = 'me@enron.com';
const NOW = '2001-06-01T00:00:00.000Z';

const COMMITMENTS: Commitment[] = [
  { who: 'alice@enron.com', what: 'Q2 report', dueBy: '2001-05-18', factId: 'f1', source: '<m1>' },
  { who: 'bob@enron.com', what: 'budget', factId: 'f2', source: '<m2>' },
];

describe('digest', () => {
  test('builds a deterministic skeleton', ({ expect }) => {
    const digest = buildDigest(input(), { now: NOW });
    expect(digest.generatedAt).toBe(NOW);
    expect(digest.threadCount).toBe(2);
    expect(digest.topicCount).toBeGreaterThan(0);
    expect(digest.stalledThreads).toContain('old deal terms');
    expect(digest.awaitingMine).toContain('q2 report');
    // Only the commitment with a deadline is due.
    expect(digest.dueCommitments).toHaveLength(1);
    expect(digest.dueCommitments[0].what).toBe('Q2 report');
    // expect(digest.topTopics.length).toBeGreaterThan(0);
    expect(digest.narrative).toBe('');
  });

  test('renderDigest emits the skeleton as text', ({ expect }) => {
    const text = renderDigest(buildDigest(input(), { now: NOW }));
    expect(text).toContain('Threads: 2');
    expect(text).toContain('old deal terms');
    expect(text).toContain('Q2 report');
  });

  test('narrateDigest fills the narrative via the summarizer and degrades on failure', async ({ expect }) => {
    const digest = buildDigest(input(), { now: NOW });
    const narrated = await narrateDigest(digest, async () => 'All quiet except the Q2 report.');
    expect(narrated.narrative).toBe('All quiet except the Q2 report.');

    const degraded = await narrateDigest(digest, async () => {
      throw new Error('model down');
    });
    expect(degraded.narrative).toBe('');
  });
});

const msg = (subject: string, from: string, created: string) =>
  Message.make({
    created,
    sender: { email: from },
    blocks: [{ _tag: 'text', text: 'body' }],
    properties: { subject, messageId: `<${from}:${created}>` },
  });

const input = () => {
  const messages = [
    // Recent thread awaiting my reply; older thread long stalled.
    msg('Q2 report', 'alice@enron.com', '2001-05-31T10:00:00.000Z'),
    msg('Old deal terms', 'bob@enron.com', '2001-04-01T10:00:00.000Z'),
  ];
  const threads = buildThreads(messages, { ownerEmail: OWNER, now: NOW });
  return {
    threads,
    topics: clusterThreads(threads),
    commitments: COMMITMENTS,
    rollups: buildRollups(messages),
  };
};
