//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Message, SpaceInvitationMessage } from '@dxos/types';

import { describeMessage } from './local-notification.ts';

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
