//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Filter, Ref, Tag } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { Cursor } from '@dxos/link';
import { TagIndex } from '@dxos/schema';
import { Message, Organization, Person } from '@dxos/types';

import * as InboxOperation from '../../types/InboxOperation';
import * as Mailbox from '../../types/Mailbox';
import { InboxOperationHandlerSet } from '../index';

const TestLayer = AssistantTestLayer({
  operationHandlers: InboxOperationHandlerSet,
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
  disableLlmMemoization: true,
});

const ME = ['me@example.com'];

const makeMessage = (email: string, subject: string, index: number, listUnsubscribe?: string) =>
  Message.make({
    created: new Date(Date.parse('2026-07-01T00:00:00.000Z') + index * 60_000).toISOString(),
    sender: { email },
    blocks: [{ _tag: 'text', text: `Body of ${subject}` }],
    properties: { subject, to: 'me@example.com', references: '<prior@example.com>', listUnsubscribe },
  });

const seedMailbox = Effect.fnUntraced(function* () {
  const { db } = yield* Database.Service;
  const mailbox = db.add(Mailbox.make({ name: 'Inbox' }));
  const feed = yield* Database.load(mailbox.feed);
  yield* Effect.promise(() =>
    db.appendToFeed(feed, [
      makeMessage('bob@example.com', 'Re: Lunch', 0),
      makeMessage('news@bulk.io', 'Re: Weekly digest', 1, '<https://bulk.io/u>'),
    ]),
  );
  yield* Effect.promise(() => db.flush());
  return { db, mailbox };
});

describe('EnrichMailbox cascade', () => {
  it.effect(
    'runs the deterministic tier in order and reports each spawned stage',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { mailbox } = yield* seedMailbox();

        const result = yield* Operation.invoke(InboxOperation.EnrichMailbox, {
          mailbox: Ref.make(mailbox),
          me: ME,
          tiers: ['deterministic'],
        });

        expect(result.completed).toBe(2);
        expect(result.failed).toBe(0);
        // Contacts first: classification's allow-list is built before any model sees a message.
        expect(result.stages.map((stage) => stage.operation)).toEqual([
          InboxOperation.ExtractCorrespondents.meta.key.toString(),
          InboxOperation.ExtractSubscriptions.meta.key.toString(),
        ]);
        expect(result.stages.every((stage) => stage.status === 'completed')).toBe(true);

        // Each spawned operation actually ran: a Person for the replied-to sender, a subscription
        // for the bulk sender.
        const people = yield* Database.query(Filter.type(Person.Person)).run;
        expect(people.map((person) => person.emails?.[0]?.value)).toEqual(['bob@example.com']);
        expect(mailbox.subscriptions?.map((subscription) => subscription.email)).toEqual(['news@bulk.io']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'skips the correspondent stage without identity addresses, and is idempotent across reruns',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { mailbox } = yield* seedMailbox();

        const first = yield* Operation.invoke(InboxOperation.EnrichMailbox, {
          mailbox: Ref.make(mailbox),
          tiers: ['deterministic'],
        });
        expect(first.skipped).toBe(1);
        expect(first.stages[0]).toMatchObject({ status: 'skipped', error: 'no identity addresses supplied' });
        expect((yield* Database.query(Filter.type(Person.Person)).run).length).toBe(0);

        // The cascade inherits each operation's idempotency: a rerun creates nothing new.
        const rerun = yield* Operation.invoke(InboxOperation.EnrichMailbox, {
          mailbox: Ref.make(mailbox),
          me: ME,
          tiers: ['deterministic'],
        });
        expect(rerun.completed).toBe(2);
        const again = yield* Operation.invoke(InboxOperation.EnrichMailbox, {
          mailbox: Ref.make(mailbox),
          me: ME,
          tiers: ['deterministic'],
        });
        expect(again.completed).toBe(2);
        expect((yield* Database.query(Filter.type(Person.Person)).run).length).toBe(1);
        expect(mailbox.subscriptions).toHaveLength(1);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'stops the cascade when a stage fails, reporting the untried stages',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { mailbox } = yield* seedMailbox();

        // No AiService is provided by this layer, so the classify tier fails — the analyze tier
        // behind it must not run against the stale gate.
        const result = yield* Operation.invoke(InboxOperation.EnrichMailbox, {
          mailbox: Ref.make(mailbox),
          me: ME,
          tiers: ['deterministic', 'classify', 'analyze'],
        });

        expect(result.failed).toBe(1);
        const statuses = result.stages.map((stage) => stage.status);
        expect(statuses).toEqual(['completed', 'completed', 'failed', 'skipped']);
        expect(result.stages.at(-1)).toMatchObject({
          tier: 'analyze',
          status: 'skipped',
          error: 'upstream stage failed',
        });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
