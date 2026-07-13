//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj } from '@dxos/echo';

import { Topic } from './Topic';

describe('Topic', () => {
  test('constructs a Topic object with expected fields', ({ expect }) => {
    const topic = Obj.make(Topic, {
      label: 'Q2 reporting',
      summary: 'Threads about the Q2 report and budget confirmation.',
      threadIds: ['q2 report', 'budget numbers'],
      participants: ['alice@enron.com', 'bob@enron.com'],
      keywords: ['q2', 'report', 'budget'],
      questions: ['When is the budget due?'],
      tasks: ['Confirm the Q2 numbers'],
    });

    expect(Obj.instanceOf(Topic, topic)).toBe(true);
    expect(topic.threadIds).toHaveLength(2);
    expect(topic.label).toBe('Q2 reporting');
  });
});
