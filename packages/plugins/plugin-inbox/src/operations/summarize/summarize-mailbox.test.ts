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
import { Message, Organization, Person } from '@dxos/types';

import { InboxOperationHandlerSet } from '#operations';

import * as InboxOperation from '../../types/InboxOperation.ts';
import * as Mailbox from '../../types/Mailbox.ts';

const TestLayer = AssistantTestLayer({
  operationHandlers: InboxOperationHandlerSet.handlers,
  types: [
    Cursor.Cursor,
    Feed.Feed,
    Mailbox.Mailbox,
    Message.Message,
    Organization.Organization,
    Person.Person,
    Tag.Tag,
    TagIndex.TagIndex,
  ],
});

const makeMessage = (email: string, subject: string, body: string, index: number) =>
  Message.make({
    created: new Date(Date.parse('2026-07-01T00:00:00.000Z') + index * 60_000).toISOString(),
    sender: { email },
    blocks: [{ _tag: 'text', text: body }],
    properties: { subject },
  });

const seedMailbox = Effect.fnUntraced(function* () {
  const { db } = yield* Database.Service;
  const mailbox = db.add(Mailbox.make({ name: 'Inbox' }));
  const feed = yield* Database.load(mailbox.feed);
  yield* Effect.promise(() =>
    db.appendToFeed(feed, [
      makeMessage(
        'bob@known.example.com',
        'Contract review Thursday',
        'Can you review the draft contract before our Thursday call? I need your comments on section 4 by Wednesday evening.',
        0,
      ),
      makeMessage(
        'promo@bulk.example.com',
        'Half price this weekend only',
        'Our biggest sale of the season is here. Use code SAVE50 at checkout for half off everything.',
        1,
      ),
    ]),
  );
  // Only Bob is a known contact — the gate that keeps this tier affordable.
  db.add(Obj.make(Person.Person, { fullName: 'Bob', emails: [{ value: 'bob@known.example.com' }] }));
  yield* Effect.promise(() => db.flush());
  return { db, mailbox };
});

const readAnnotations = Effect.fnUntraced(function* (mailbox: Mailbox.Mailbox) {
  const annotations = mailbox.annotations?.target;
  return annotations ? yield* Feed.query(annotations, Filter.type(Message.Message)).run : [];
});

describe('SummarizeMailbox', { tags: ['model-fixture'] }, () => {
  it.effect(
    'summarizes contact mail only, into the annotation feed, and skips what it already summarized',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { mailbox } = yield* seedMailbox();

        const first = yield* Operation.invoke(InboxOperation.SummarizeMailbox, { mailbox: Ref.make(mailbox) });
        // The bulk sender has no Person, so it never reaches the model.
        expect(first.pending).toBe(1);
        expect(first.summarized).toBe(1);
        expect(first.remaining).toBe(0);

        const annotations = yield* readAnnotations(mailbox);
        expect(annotations).toHaveLength(1);
        const [annotation] = annotations;
        expect(Mailbox.getSummaryText(annotation)).toBeTruthy();
        expect(annotation.properties?.model).toBe('com.anthropic.model.claude-haiku-4-5.default');

        // The summary names its subject, so the merge can pair them without a side table.
        const feed = yield* Database.load(mailbox.feed);
        const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
        const contactMessage = messages.find((message) => message.sender?.email === 'bob@known.example.com');
        expect(contactMessage).toBeDefined();
        expect(annotation.parentMessage).toBe(contactMessage?.id);

        // Idempotent by parent id, not by cursor: a rerun finds nothing left to do.
        const rerun = yield* Operation.invoke(InboxOperation.SummarizeMailbox, { mailbox: Ref.make(mailbox) });
        expect(rerun.pending).toBe(0);
        expect(rerun.summarized).toBe(0);
        expect(yield* readAnnotations(mailbox)).toHaveLength(1);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'batchLimit bounds a run; the rest is reported as remaining',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { db, mailbox } = yield* seedMailbox();
        // Drop the gate so both messages are candidates, then allow only one per run.
        const result = yield* Operation.invoke(InboxOperation.SummarizeMailbox, {
          mailbox: Ref.make(mailbox),
          contactsOnly: false,
          batchLimit: 1,
        });
        expect(result.pending).toBe(2);
        expect(result.summarized).toBe(1);
        expect(result.remaining).toBe(1);
        void db;
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
