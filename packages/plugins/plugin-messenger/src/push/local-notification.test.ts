//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Message, SpaceInvitationMessage } from '@dxos/types';

import { describeMessage, makeArrivals } from './local-notification.ts';

const SPACE_KEY = 'ab'.repeat(32);

describe('describeMessage', () => {
  test('names the space and the sender of an invitation', () => {
    const message = SpaceInvitationMessage.make({
      sender: { name: 'Alice' },
      spaceKey: SPACE_KEY,
      role: 1,
      spaceName: 'Garden',
    });
    expect(describeMessage(message)).toEqual({ title: 'Invitation to Garden', body: 'Alice invited you to join.' });
  });

  test('an invitation without names still reads as one', () => {
    const message = SpaceInvitationMessage.make({ sender: {}, spaceKey: SPACE_KEY, role: 1 });
    expect(describeMessage(message)).toEqual({ title: 'Space invitation', body: 'A contact invited you to join.' });
  });

  test('a message shows its sender over its subject, or its first text without one', () => {
    const blocks = [{ _tag: 'text' as const, text: 'Lunch?' }];
    expect(
      describeMessage(Message.make({ sender: { name: 'Bob' }, blocks, properties: { subject: 'Plans' } })),
    ).toEqual({ title: 'Bob', body: 'Plans' });
    expect(describeMessage(Message.make({ sender: { name: 'Bob' }, blocks }))).toEqual({
      title: 'Bob',
      body: 'Lunch?',
    });
    expect(describeMessage(Message.make({ sender: {} }))).toEqual({
      title: 'New message',
      body: 'You have a new message.',
    });
  });

  test('strips control characters and caps long names', () => {
    const name = `Mallory\n${'x'.repeat(100)}`;
    const { title } = describeMessage(Message.make({ sender: { name } }));
    expect(title).toHaveLength(60);
    expect(title.startsWith('Mallory x')).toBe(true);
    expect(title.endsWith('…')).toBe(true);
  });
});

describe('makeArrivals', () => {
  const since = Date.parse('2026-10-26T18:00:00Z');
  const at = (created: string, text: string) =>
    Message.make({ created, sender: { name: 'Bob' }, blocks: [{ _tag: 'text', text }] });
  const view = (messages: Message.Message[], read: string[] = []) => ({ messages, read: new Set(read) });

  test('announces each new unread message once, whichever device filed it', () => {
    const arrivals = makeArrivals({
      since,
      key: (message) => message.blocks.map((block) => block._tag).join() + message.created,
    });
    const first = at('2026-10-26T18:05:00Z', 'one');
    const second = at('2026-10-26T18:06:00Z', 'two');
    expect(arrivals(view([first]))).toEqual([first]);
    expect(arrivals(view([first, second]))).toEqual([second]);
    expect(arrivals(view([first, second]))).toEqual([]);
  });

  test('skips the backlog sent before the app started, allowing for clock skew, and read messages', () => {
    const arrivals = makeArrivals({ since, key: (message) => message.id });
    const backlog = at('2026-10-26T17:30:00Z', 'old');
    const skewed = at('2026-10-26T17:59:00Z', 'skewed');
    const read = at('2026-10-26T18:05:00Z', 'read');
    expect(arrivals(view([backlog, skewed, read], [read.id]))).toEqual([skewed]);
  });

  test('a copy another device filed under a new id is the same message', () => {
    const arrivals = makeArrivals({ since, key: () => 'envelope-1' });
    expect(arrivals(view([at('2026-10-26T18:05:00Z', 'one')]))).toHaveLength(1);
    expect(arrivals(view([at('2026-10-26T18:05:00Z', 'one')]))).toEqual([]);
  });
});
