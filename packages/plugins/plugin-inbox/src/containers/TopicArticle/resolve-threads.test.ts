//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Message } from '@dxos/types';

import { resolveTopicThreads } from './resolve-threads';

describe('resolveTopicThreads', () => {
  test('returns only threads referenced by the topic, grouped and ordered', ({ expect }) => {
    // Two messages thread on the normalized subject "q2 report"; a third is a separate thread.
    const messages = [
      msg('Q2 report', '2026-01-01T10:00:00.000Z'),
      msg('Re: Q2 report', '2026-01-02T10:00:00.000Z'),
      msg('Launch plan', '2026-01-03T10:00:00.000Z'),
    ];
    const threads = resolveTopicThreads({ threadIds: ['q2 report'] }, messages);
    expect(threads).toHaveLength(1);
    expect(threads[0].threadId).toBe('q2 report');
    expect(threads[0].messages).toHaveLength(2);
    // Oldest first; subject taken from the first message.
    expect(threads[0].messages[0].created).toBe('2026-01-01T10:00:00.000Z');
    expect(threads[0].subject).toBe('Q2 report');
  });

  test('preserves topic threadId order and omits threads with no resolved messages', ({ expect }) => {
    const messages = [msg('Launch plan', '2026-01-03T10:00:00.000Z'), msg('Q2 report', '2026-01-01T10:00:00.000Z')];
    const threads = resolveTopicThreads({ threadIds: ['q2 report', 'missing', 'launch plan'] }, messages);
    expect(threads.map((thread) => thread.threadId)).toEqual(['q2 report', 'launch plan']);
  });
});

const msg = (subject: string, created: string) =>
  Message.make({
    created,
    sender: { email: 'alice@example.com' },
    blocks: [{ _tag: 'text', text: 'body' }],
    properties: { subject },
  });
