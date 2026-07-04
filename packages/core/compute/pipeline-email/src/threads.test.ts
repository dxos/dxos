//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Message } from '@dxos/types';

import { buildThreads } from './threads';

const msg = (subject: string, from: string, created: string, summary?: string) =>
  Message.make({
    created,
    sender: { email: from },
    blocks: [{ _tag: 'text', text: 'body' }],
    properties: { subject, messageId: `<${from}:${created}>`, ...(summary ? { summary } : {}) },
  });

const OWNER = 'me@enron.com';

describe('buildThreads', () => {
  test('groups messages by normalized subject', ({ expect }) => {
    const threads = buildThreads(
      [
        msg('Deal terms', 'a@x.com', '2001-05-01T10:00:00.000Z'),
        msg('RE: Deal terms', OWNER, '2001-05-01T11:00:00.000Z'),
        msg('Lunch?', 'b@x.com', '2001-05-01T12:00:00.000Z'),
      ],
      { ownerEmail: OWNER, now: '2001-05-02T00:00:00.000Z' },
    );

    expect(threads).toHaveLength(2);
    const deal = threads.find((thread) => thread.threadId === 'deal terms');
    expect(deal?.messageIds).toHaveLength(2);
    expect([...(deal?.participants ?? [])].sort()).toEqual(['a@x.com', 'me@enron.com']);
  });

  test('state is awaiting-theirs when owner sent last', ({ expect }) => {
    const [thread] = buildThreads(
      [
        msg('Deal terms', 'a@x.com', '2001-05-01T10:00:00.000Z'),
        msg('RE: Deal terms', OWNER, '2001-05-01T11:00:00.000Z'),
      ],
      { ownerEmail: OWNER, now: '2001-05-02T00:00:00.000Z' },
    );
    expect(thread.state).toBe('awaiting-theirs');
  });

  test('state is awaiting-mine when other party sent last', ({ expect }) => {
    const [thread] = buildThreads([msg('Deal terms', 'a@x.com', '2001-05-01T10:00:00.000Z')], {
      ownerEmail: OWNER,
      now: '2001-05-02T00:00:00.000Z',
    });
    expect(thread.state).toBe('awaiting-mine');
  });

  test('state is stalled when awaiting past the stale period', ({ expect }) => {
    const [thread] = buildThreads([msg('Deal terms', 'a@x.com', '2001-05-01T10:00:00.000Z')], {
      ownerEmail: OWNER,
      now: '2001-06-01T00:00:00.000Z',
    });
    expect(thread.state).toBe('stalled');
  });

  test('summary concatenates per-message summaries', ({ expect }) => {
    const [thread] = buildThreads(
      [
        msg('Deal terms', 'a@x.com', '2001-05-01T10:00:00.000Z', 'Opening offer.'),
        msg('RE: Deal terms', OWNER, '2001-05-01T11:00:00.000Z', 'Countered.'),
      ],
      { ownerEmail: OWNER, now: '2001-05-02T00:00:00.000Z' },
    );
    expect(thread.summary).toContain('Opening offer.');
    expect(thread.summary).toContain('Countered.');
  });
});
