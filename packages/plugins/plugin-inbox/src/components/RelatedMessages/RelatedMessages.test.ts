//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Message } from '@dxos/types';

import { latestPerConversation, messageDigest } from './RelatedMessages.tsx';

const message = (id: string, created: string, threadId?: string): Message.Message =>
  ({ id, created, threadId }) as Message.Message;

describe('latestPerConversation', () => {
  test('keeps only the newest message of each thread', ({ expect }) => {
    const result = latestPerConversation([
      message('a1', '2026-01-01T00:00:00Z', 't1'),
      message('a2', '2026-01-03T00:00:00Z', 't1'),
      message('a3', '2026-01-02T00:00:00Z', 't1'),
    ]);

    expect(result.map((entry) => entry.id)).toEqual(['a2']);
  });

  test('treats messages without a threadId as their own conversation', ({ expect }) => {
    // Otherwise every unthreaded message would collapse into a single row.
    const result = latestPerConversation([
      message('a1', '2026-01-01T00:00:00Z'),
      message('a2', '2026-01-02T00:00:00Z'),
    ]);

    expect(result.map((entry) => entry.id)).toEqual(['a2', 'a1']);
  });

  test('orders conversations newest first', ({ expect }) => {
    const result = latestPerConversation([
      message('old', '2026-01-01T00:00:00Z', 't1'),
      message('new', '2026-01-05T00:00:00Z', 't2'),
      message('mid', '2026-01-03T00:00:00Z', 't3'),
    ]);

    expect(result.map((entry) => entry.id)).toEqual(['new', 'mid', 'old']);
  });

  test('tolerates a missing created timestamp', ({ expect }) => {
    const result = latestPerConversation([
      message('dated', '2026-01-01T00:00:00Z', 't1'),
      { id: 'undated', threadId: 't1' } as Message.Message,
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('dated');
  });

  describe('messageDigest', () => {
    const withProps = (id: string, properties: Record<string, unknown>): Message.Message =>
      ({ id, created: '2026-07-01T00:00:00.000Z', properties }) as unknown as Message.Message;

    test('prefers the derived summary', ({ expect }) => {
      const summaries = new Map([['m1', 'Agreed to ship on Friday.']]);
      expect(messageDigest(withProps('m1', { subject: 'Re: launch', snippet: 'Sounds good...' }), summaries)).toBe(
        'Agreed to ship on Friday.',
      );
    });

    test('falls back to the provider snippet before the subject', ({ expect }) => {
      // Both mail mappers set `snippet`, so this rung is populated for synced mail even before any
      // summarization has run.
      expect(messageDigest(withProps('m1', { subject: 'Re: launch', snippet: 'Sounds good...' }))).toBe(
        'Sounds good...',
      );
    });

    test('falls back to the subject when nothing better exists', ({ expect }) => {
      expect(messageDigest(withProps('m1', { subject: 'Re: launch' }))).toBe('Re: launch');
    });

    test('is undefined when the message says nothing', ({ expect }) => {
      expect(messageDigest(withProps('m1', {}))).toBeUndefined();
    });

    test('ignores a summary belonging to a different message', ({ expect }) => {
      const summaries = new Map([['other', 'Not this one.']]);
      expect(messageDigest(withProps('m1', { snippet: 'Mine.' }), summaries)).toBe('Mine.');
    });
  });
});
