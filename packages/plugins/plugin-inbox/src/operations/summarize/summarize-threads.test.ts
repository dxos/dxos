//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Message } from '@dxos/types';

import { groupThreads, promptFor, threadSubject } from './summarize-mailbox.ts';

const makeMessage = ({
  minutes,
  threadId,
  subject,
  body = 'Body',
  email = 'bob@example.com',
}: {
  minutes: number;
  threadId?: string;
  subject?: string;
  body?: string;
  email?: string;
}) =>
  Message.make({
    created: new Date(Date.parse('2026-07-01T00:00:00.000Z') + minutes * 60_000).toISOString(),
    sender: { email },
    blocks: [{ _tag: 'text', text: body }],
    properties: { subject, threadId },
    threadId,
  });

describe('thread grouping', () => {
  test('groups by threadId, oldest message first', ({ expect }) => {
    const first = makeMessage({ minutes: 0, threadId: 'thread-a' });
    const reply = makeMessage({ minutes: 10, threadId: 'thread-a' });
    const other = makeMessage({ minutes: 5, threadId: 'thread-b' });

    // Fed in a deliberately jumbled order: a feed appends as mail arrives, and a backfill can append
    // an older message after a newer one.
    const threads = groupThreads([reply, other, first]);
    expect(threads).toHaveLength(2);
    const threadA = threads.find((thread) => thread[0].threadId === 'thread-a')!;
    expect(threadA.map((message) => message.id)).toEqual([first.id, reply.id]);
  });

  test('a message with no threadId is its own conversation', ({ expect }) => {
    // NOT one `null` group: unrelated messages that merely lack a thread id are not an exchange.
    const loose = [makeMessage({ minutes: 0 }), makeMessage({ minutes: 1 }), makeMessage({ minutes: 2 })];
    const threads = groupThreads(loose);
    expect(threads).toHaveLength(3);
    expect(threads.every((thread) => thread.length === 1)).toBe(true);
  });

  test("the subject is the thread's newest message, so a later reply invalidates the summary", ({ expect }) => {
    const first = makeMessage({ minutes: 0, threadId: 'thread-a' });
    const reply = makeMessage({ minutes: 10, threadId: 'thread-a' });
    const [thread] = groupThreads([first, reply]);
    expect(threadSubject(thread).id).toBe(reply.id);

    // The same thread with one more reply files under the NEW newest message, which is what makes the
    // next run re-summarize it rather than reporting it already done.
    const later = makeMessage({ minutes: 20, threadId: 'thread-a' });
    const [grown] = groupThreads([first, reply, later]);
    expect(threadSubject(grown).id).toBe(later.id);
  });
});

describe('thread prompt', () => {
  test('carries every message, oldest first, with its sender and date', ({ expect }) => {
    const thread = [
      makeMessage({ minutes: 0, threadId: 't', subject: 'Contract review', body: 'Please review.', email: 'a@x.com' }),
      makeMessage({ minutes: 10, threadId: 't', body: 'Comments attached.', email: 'b@x.com' }),
    ];
    const prompt = promptFor(thread);
    expect(prompt).toContain('SUBJECT: Contract review');
    expect(prompt).toContain('MESSAGES: 2');
    expect(prompt.indexOf('Please review.')).toBeLessThan(prompt.indexOf('Comments attached.'));
    expect(prompt).toContain('a@x.com');
    expect(prompt).toContain('b@x.com');
  });

  test('drops the OLDEST messages when the transcript exceeds its budget', ({ expect }) => {
    // A summary states where an exchange stands, so recency is what must survive a trim.
    const long = 'x'.repeat(1_900);
    const thread = Array.from({ length: 12 }, (_, index) =>
      makeMessage({
        minutes: index,
        threadId: 't',
        body: `${index === 0 ? 'OLDEST' : index === 11 ? 'NEWEST' : 'mid'} ${long}`,
      }),
    );
    const prompt = promptFor(thread);
    expect(prompt).toContain('NEWEST');
    expect(prompt).not.toContain('OLDEST');
  });
});
