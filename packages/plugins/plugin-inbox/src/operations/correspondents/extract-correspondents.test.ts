//
// Copyright 2026 DXOS.org
//

import { describe, it, test } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { expect } from 'vitest';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { Cursor } from '@dxos/link';
import { TagIndex } from '@dxos/schema';
import { Message, Organization, Person } from '@dxos/types';

import { InboxOperationHandlerSet } from '#operations';
import { InboxOperation, Mailbox } from '#types';

import { deriveCorrespondents, parseAddressList } from './correspondence';

const TestLayer = AssistantTestLayer({
  operationHandlers: InboxOperationHandlerSet.handlers,
  types: [
    Cursor.Cursor,
    Feed.Feed,
    Mailbox.Mailbox,
    Message.Message,
    Organization.Organization,
    Person.Person,
    TagIndex.TagIndex,
  ],
  disableLlmMemoization: true,
});

const ME = ['me@example.com', 'me@alt.example.com'];

type MessageProps = {
  sender: { email: string; name?: string };
  subject: string;
  to?: string;
  cc?: string;
  references?: string;
  noReply?: boolean;
  listUnsubscribe?: string;
};

const makeMessage = ({ sender, subject, to, cc, references, noReply, listUnsubscribe }: MessageProps, index: number) =>
  Message.make({
    created: new Date(Date.parse('2026-07-01T00:00:00.000Z') + index * 60_000).toISOString(),
    sender,
    blocks: [{ _tag: 'text', text: `Body of ${subject}` }],
    properties: { subject, to, cc, references, noReply, listUnsubscribe },
  });

const seedMailbox = Effect.fnUntraced(function* (messages: MessageProps[]) {
  const { db } = yield* Database.Service;
  const mailbox = db.add(Mailbox.make({ name: 'Inbox' }));
  const feed = yield* Database.load(mailbox.feed);
  yield* Effect.promise(() => db.appendToFeed(feed, messages.map(makeMessage)));
  yield* Effect.promise(() => db.flush());
  return { db, mailbox, feed };
});

describe('correspondence', () => {
  test('parseAddressList handles bracketed, bare, and multi-entry forms', () => {
    expect(parseAddressList('Jane Doe <jane@example.com>')).toEqual([{ email: 'jane@example.com', name: 'Jane Doe' }]);
    expect(parseAddressList('jane@example.com')).toEqual([{ email: 'jane@example.com' }]);
    expect(parseAddressList('"Doe, Jane" <jane@example.com>, bob@example.com')).toEqual([
      { email: 'jane@example.com', name: 'Doe, Jane' },
      { email: 'bob@example.com' },
    ]);
    expect(parseAddressList(undefined)).toEqual([]);
    expect(parseAddressList('no address here')).toEqual([]);
  });

  test('deriveCorrespondents finds outbound recipients and direct repliers', () => {
    const messages = [
      // Outbound: recipient qualifies.
      makeMessage({ sender: { email: 'me@example.com' }, subject: 'Intro', to: 'Alice <alice@example.com>' }, 0),
      // Inbound reply addressed to me: sender qualifies.
      makeMessage(
        {
          sender: { email: 'bob@example.com', name: 'Bob' },
          subject: 'Re: Intro',
          to: 'Me <me@example.com>',
          references: '<msg-1@example.com>',
        },
        1,
      ),
      // Inbound reply NOT addressed to me: sender does not qualify.
      makeMessage({ sender: { email: 'carol@example.com' }, subject: 'Re: Other', to: 'Other <other@example.com>' }, 2),
      // Fresh inbound (not a reply): sender does not qualify.
      makeMessage({ sender: { email: 'dave@example.com' }, subject: 'Cold outreach', to: 'me@example.com' }, 3),
    ];
    const correspondents = deriveCorrespondents(messages, ME);
    expect(correspondents.map((entry) => entry.email).sort()).toEqual(['alice@example.com', 'bob@example.com']);
  });

  test('one clean personal reply outweighs list mail from the same sender', () => {
    const messages = [
      makeMessage(
        {
          sender: { email: 'jane@example.com' },
          subject: 'Re: Catch-up',
          to: 'me@example.com',
          listUnsubscribe: '<https://list.example.com/unsub>',
        },
        0,
      ),
      makeMessage({ sender: { email: 'jane@example.com' }, subject: 'Re: Catch-up', to: 'me@example.com' }, 1),
    ];
    const correspondents = deriveCorrespondents(messages, ME);
    expect(correspondents).toEqual([{ email: 'jane@example.com', name: undefined, automated: false }]);
  });
});

describe('ExtractCorrespondents operation', () => {
  it.effect(
    'creates Persons for correspondents and is idempotent across reruns',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { db, feed, mailbox } = yield* seedMailbox([
          { sender: { email: 'me@example.com' }, subject: 'Intro', to: 'Alice Smith <alice@example.com>' },
          {
            sender: { email: 'bob@example.com', name: 'Bob Jones' },
            subject: 'Re: Intro',
            to: 'me@example.com',
            references: '<msg@example.com>',
          },
          // Newsletter reply-shaped mail: qualifies as correspondence but denied as automated.
          {
            sender: { email: 'news@bulk.example.com' },
            subject: 'Re: Your subscription',
            to: 'me@example.com',
            listUnsubscribe: '<https://bulk.example.com/unsub>',
          },
        ]);

        const first = yield* Operation.invoke(InboxOperation.ExtractCorrespondents, {
          mailbox: Ref.make(mailbox),
          me: ME,
        });
        expect(first.scanned).toBe(3);
        expect(first.correspondents).toBe(3);
        expect(first.created).toBe(2);
        // Both correspondents share the corporate domain example.com → exactly one derived Organization.
        expect(first.organizations).toBe(1);
        const [organization] = yield* Database.query(Filter.type(Organization.Organization)).run;
        expect(organization?.website).toBe('https://example.com');

        const people = yield* Database.query(Filter.type(Person.Person)).run;
        expect(people.map((person) => person.emails?.[0]?.value).sort()).toEqual([
          'alice@example.com',
          'bob@example.com',
        ]);
        expect(people.find((person) => person.emails?.[0]?.value === 'bob@example.com')?.fullName).toBe('Bob Jones');

        // Rerun: the identity index resolves both correspondents, so nothing new is created.
        const rerun = yield* Operation.invoke(InboxOperation.ExtractCorrespondents, {
          mailbox: Ref.make(mailbox),
          me: ME,
        });
        expect(rerun.created).toBe(0);
        expect(rerun.organizations).toBe(0);
        expect((yield* Database.query(Filter.type(Person.Person)).run).length).toBe(2);
        expect((yield* Database.query(Filter.type(Organization.Organization)).run).length).toBe(1);

        // Incremental: a new reply from a new sender yields exactly one more Person.
        yield* Effect.promise(() =>
          db.appendToFeed(feed, [
            makeMessage(
              { sender: { email: 'eve@example.com', name: 'Eve' }, subject: 'Re: Intro', to: 'me@example.com' },
              9,
            ),
          ]),
        );
        const incremental = yield* Operation.invoke(InboxOperation.ExtractCorrespondents, {
          mailbox: Ref.make(mailbox),
          me: ME,
        });
        expect(incremental.created).toBe(1);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'links a correspondent to an existing Organization by domain',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { db, mailbox } = yield* seedMailbox([
          {
            sender: { email: 'jane@initech.com', name: 'Jane' },
            subject: 'Re: Contract',
            to: 'me@example.com',
          },
        ]);
        const organization = db.add(
          Obj.make(Organization.Organization, { name: 'Initech', website: 'https://initech.com' }),
        );
        yield* Effect.promise(() => db.flush());

        const result = yield* Operation.invoke(InboxOperation.ExtractCorrespondents, {
          mailbox: Ref.make(mailbox),
          me: ME,
        });
        expect(result.created).toBe(1);
        const [person] = yield* Database.query(Filter.type(Person.Person)).run;
        expect(person.organization?.target?.id).toBe(organization.id);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
