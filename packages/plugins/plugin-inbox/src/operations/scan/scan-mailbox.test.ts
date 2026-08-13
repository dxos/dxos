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

import { InboxOperationHandlerSet } from '#operations';

import * as InboxOperation from '../../types/InboxOperation';
import * as Mailbox from '../../types/Mailbox';

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

describe('ScanMailbox cascade', () => {
  it.effect(
    'runs the deterministic tier in order and reports each spawned stage',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { mailbox } = yield* seedMailbox();

        const result = yield* Operation.invoke(InboxOperation.ScanMailbox, {
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

        const first = yield* Operation.invoke(InboxOperation.ScanMailbox, {
          mailbox: Ref.make(mailbox),
          tiers: ['deterministic'],
        });
        expect(first.skipped).toBe(1);
        expect(first.stages[0]).toMatchObject({ status: 'skipped', error: 'no identity addresses supplied' });
        expect((yield* Database.query(Filter.type(Person.Person)).run).length).toBe(0);

        // The cascade inherits each operation's idempotency: a rerun creates nothing new.
        const rerun = yield* Operation.invoke(InboxOperation.ScanMailbox, {
          mailbox: Ref.make(mailbox),
          me: ME,
          tiers: ['deterministic'],
        });
        expect(rerun.completed).toBe(2);
        const again = yield* Operation.invoke(InboxOperation.ScanMailbox, {
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
    'runs the tiers in cascade order however the caller lists them',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { mailbox } = yield* seedMailbox();

        // `tiers` is a SET: a caller naming the cheap LLM tier before the deterministic one must not
        // get a classification pass whose contact allow-list has not been built yet. Classification
        // fails here (the client has no usable key in this environment), which is what pins the order —
        // the deterministic stages ran first and the failure lands on the third stage, not the first.
        const result = yield* Operation.invoke(InboxOperation.ScanMailbox, {
          mailbox: Ref.make(mailbox),
          me: ME,
          tiers: ['classify', 'deterministic'],
        });

        expect(result.stages.map((stage) => stage.tier)).toEqual(['deterministic', 'deterministic', 'classify']);
        expect(result.stages.map((stage) => stage.status)).toEqual(['completed', 'completed', 'failed']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'skips the AI tiers instead of failing when no resolver serves the model',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { mailbox } = yield* seedMailbox();

        // The app's real condition: `AiService` is in the stack but no resolver claims the model —
        // plugin-assistant contributes the Anthropic one on its own Start event, so a run before the
        // assistant is up asks for a model nobody serves. That is a precondition, not a fault: the
        // deterministic work stands, the cascade reports no failure, and each AI tier says why it did
        // not run (rather than the first one being blamed for the rest).
        // `analyze` is included: it is missing a DIFFERENT precondition (a FactStore no plugin here
        // contributes), so one run exercises both flavours and shows each tier naming its own reason
        // rather than inheriting the first one's.
        const result = yield* Operation.invoke(InboxOperation.ScanMailbox, {
          mailbox: Ref.make(mailbox),
          me: ME,
          tiers: ['deterministic', 'classify', 'summarize', 'analyze'],
          model: 'com.example.model.does-not-exist.default',
        });

        expect(result.failed).toBe(0);
        expect(result.completed).toBe(2);
        expect(result.stages.map((stage) => stage.status)).toEqual([
          'completed',
          'completed',
          'skipped',
          'skipped',
          'skipped',
        ]);
        for (const stage of result.stages.slice(2, 4)) {
          expect(stage.error).toBe('ai unavailable (assistant not ready)');
        }
        expect(result.stages.at(-1)).toMatchObject({
          tier: 'analyze',
          error: '@dxos/pipeline-rdf/FactStore unavailable',
        });

        // The deterministic tier's writes are intact.
        expect((yield* Database.query(Filter.type(Person.Person)).run).length).toBe(1);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'skips a tier whose service no plugin contributed, rather than failing the cascade',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { mailbox } = yield* seedMailbox();

        // `analyze` declares `FactStore`, which only plugin-brain contributes; this layer has no such
        // provider, so the process invoker rejects at spawn time. That is the same class of unmet
        // precondition as an absent `AiService` — the host app did not contribute something a tier
        // declared — and must be reported the same way, or one uninstalled plugin turns a healthy
        // mailbox's scan red and strands the deterministic work behind it.
        const result = yield* Operation.invoke(InboxOperation.ScanMailbox, {
          mailbox: Ref.make(mailbox),
          me: ME,
          tiers: ['deterministic', 'analyze'],
        });

        expect(result.failed).toBe(0);
        expect(result.completed).toBe(2);
        expect(result.stages.map((stage) => stage.status)).toEqual(['completed', 'completed', 'skipped']);
        expect(result.stages.at(-1)?.error).toContain('unavailable');

        // The deterministic tier's writes survive the skip.
        expect((yield* Database.query(Filter.type(Person.Person)).run).length).toBe(1);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'stops the cascade when a stage genuinely fails, reporting the untried stages',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { mailbox } = yield* seedMailbox();

        // A real failure rather than an absent resolver (here: the client rejects the request), so
        // everything behind it must not run against the stale gate.
        const result = yield* Operation.invoke(InboxOperation.ScanMailbox, {
          mailbox: Ref.make(mailbox),
          me: ME,
          tiers: ['deterministic', 'classify', 'analyze'],
        });

        expect(result.failed).toBe(1);
        expect(result.stages.map((stage) => stage.status)).toEqual(['completed', 'completed', 'failed', 'skipped']);
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
