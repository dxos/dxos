//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Filter, Obj, Ref, Tag } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { Cursor } from '@dxos/link';
import { TagIndex } from '@dxos/schema';
import { Message, Person } from '@dxos/types';

import { InboxOperationHandlerSet } from '#operations';
import { InboxOperation, Mailbox } from '#types';

import { getTaggedIds } from '../../types/SystemTags.ts';

const TestLayer = AssistantTestLayer({
  operationHandlers: InboxOperationHandlerSet.handlers,
  types: [Cursor.Cursor, Feed.Feed, Mailbox.Mailbox, Message.Message, Person.Person, Tag.Tag, TagIndex.TagIndex],
});

type Fixture = {
  sender: { email: string; name?: string };
  subject: string;
  body: string;
  listUnsubscribe?: string;
};

/**
 * A deliberately unambiguous mini-corpus: one message per expected verdict, so recorded model turns
 * stay stable across model versions.
 */
const FIXTURES: Fixture[] = [
  {
    sender: { email: 'bob@known.example.com', name: 'Bob Friend' },
    subject: 'Lunch on Thursday?',
    body: 'Hey, are we still on for lunch on Thursday at noon?',
  },
  {
    sender: { email: 'winner@lottery-claims.biz' },
    subject: 'URGENT: You have won $1,000,000 — claim now',
    body: 'You are the lucky winner! Send your bank account details immediately to claim your prize before it expires.',
  },
  {
    sender: { email: 'deals@shopmail.example.com', name: 'ShopMail' },
    subject: '48-hour flash sale: 40% off everything',
    body: 'Our biggest sale of the season. Use code FLASH40 at checkout. Shop now!',
    listUnsubscribe: '<https://shopmail.example.com/unsubscribe>',
  },
  {
    sender: { email: 'receipts@cloudservice.example.com' },
    subject: 'Your July invoice is available',
    body: 'Your invoice for July 2026 is now available in your account dashboard. Amount due: $12.00.',
  },
];

const seedMailbox = Effect.fnUntraced(function* () {
  const { db } = yield* Database.Service;
  const mailbox = db.add(Mailbox.make({ name: 'Inbox' }));
  const feed = yield* Database.load(mailbox.feed);
  yield* Effect.promise(() =>
    db.appendToFeed(
      feed,
      FIXTURES.map((fixture, index) =>
        Message.make({
          created: new Date(Date.parse('2026-07-01T00:00:00.000Z') + index * 60_000).toISOString(),
          sender: fixture.sender,
          blocks: [{ _tag: 'text', text: fixture.body }],
          properties: { subject: fixture.subject, listUnsubscribe: fixture.listUnsubscribe },
        }),
      ),
    ),
  );
  // The known-person allowlist: Bob has a Person record, so his mail must never reach the model.
  db.add(Obj.make(Person.Person, { fullName: 'Bob Friend', emails: [{ value: 'bob@known.example.com' }] }));
  yield* Effect.promise(() => db.flush());
  return { db, mailbox, feed };
});

/** Subjects of the mailbox's messages carrying the canonical tag with the given label. */
const taggedSubjects = Effect.fnUntraced(function* (mailbox: Mailbox.Mailbox, label: string) {
  const tags = yield* Database.query(Filter.type(Tag.Tag)).run;
  const tag = tags.find((candidate) => candidate.label === label);
  if (!tag) {
    return [];
  }
  const feed = yield* Database.load(mailbox.feed);
  const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
  const ids = getTaggedIds(mailbox, Obj.getURI(tag).toString());
  return messages.filter((message) => ids.has(message.id)).map((message) => message.properties?.subject);
});

describe('ClassifyMailbox operation', { tags: ['model-fixture'] }, () => {
  it.effect(
    'labels the batch: known-person shortcut, spam verdict, category tags, cursor advance',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { mailbox } = yield* seedMailbox();

        const result = yield* Operation.invoke(InboxOperation.ClassifyMailbox, { mailbox: Ref.make(mailbox) });
        expect(result.processed).toBe(4);
        expect(result.known).toBe(1);
        expect(result.spam).toBe(1);
        expect(result.remaining).toBe(0);

        // The phishing message is spam; Bob's is personal without an LLM call; the rest get categories.
        expect(yield* taggedSubjects(mailbox, 'Spam')).toEqual(['URGENT: You have won $1,000,000 — claim now']);
        expect(yield* taggedSubjects(mailbox, 'Personal')).toContain('Lunch on Thursday?');

        // Cursored: a rerun with nothing new classifies nothing (no further LLM spend).
        const rerun = yield* Operation.invoke(InboxOperation.ClassifyMailbox, { mailbox: Ref.make(mailbox) });
        expect(rerun.processed).toBe(0);
        expect(rerun.remaining).toBe(0);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'batchLimit bounds a run and the next run resumes from the cursor',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { mailbox } = yield* seedMailbox();

        const first = yield* Operation.invoke(InboxOperation.ClassifyMailbox, {
          mailbox: Ref.make(mailbox),
          batchLimit: 2,
        });
        expect(first.processed).toBe(2);
        expect(first.remaining).toBe(2);

        const second = yield* Operation.invoke(InboxOperation.ClassifyMailbox, {
          mailbox: Ref.make(mailbox),
          batchLimit: 2,
        });
        expect(second.processed).toBe(2);
        expect(second.remaining).toBe(0);

        // Reset via the shared cursor-reset operation, targeting the classify consumer id.
        const reset = yield* Operation.invoke(InboxOperation.ResetFeedCursor, {
          mailbox: Ref.make(mailbox),
          cursorId: 'classifyMailbox',
        });
        expect(reset.reset).toBe(true);
        const again = yield* Operation.invoke(InboxOperation.ClassifyMailbox, { mailbox: Ref.make(mailbox) });
        expect(again.processed).toBe(4);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
