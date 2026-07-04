//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj } from '@dxos/echo';

import { Thread } from './Thread';

describe('Thread', () => {
  test('constructs a Thread object with expected fields', ({ expect }) => {
    const thread = Obj.make(Thread, {
      threadId: 'deal terms',
      subject: 'Deal terms',
      summary: 'Negotiation over Q2 deal terms.',
      state: 'awaiting-mine',
      participants: ['a@x.com', 'b@x.com'],
      messageIds: ['<m-1@x.com>', '<m-2@x.com>'],
      openQuestions: ['What is the close date?'],
      actionItems: ['Send revised terms'],
    });

    expect(Obj.instanceOf(Thread, thread)).toBe(true);
    expect(thread.threadId).toBe('deal terms');
    expect(thread.state).toBe('awaiting-mine');
    expect(thread.participants).toHaveLength(2);
  });
});
