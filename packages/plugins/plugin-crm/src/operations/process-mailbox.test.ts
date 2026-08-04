//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { Operation } from '@dxos/compute';
import { Database, Feed, Filter, Obj, Ref, Relation } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { Cursor } from '@dxos/link';
import { Mailbox } from '@dxos/plugin-inbox';
import { Markdown } from '@dxos/plugin-markdown/types';
import { TagIndex, Text } from '@dxos/schema';
import { Message, Organization, Person } from '@dxos/types';

import { EMAIL_FIXTURES, makeEmailMessage } from '../testing';
import { CrmOperation, ProfileOf } from '../types';
import { CrmOperationHandlerSet } from './index';

const TestLayer = AssistantTestLayer({
  operationHandlers: CrmOperationHandlerSet,
  types: [
    Mailbox.Mailbox,
    Feed.Feed,
    TagIndex.TagIndex,
    Message.Message,
    Person.Person,
    Organization.Organization,
    Cursor.Cursor,
    Markdown.Document,
    Text.Text,
    ProfileOf.ProfileOf,
  ],
  disableLlmMemoization: true,
});

describe('ProcessMailbox operation', () => {
  it.effect(
    'extracts gated contacts from new messages and advances a durable feed cursor',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { db, mailbox, messages } = yield* seedMailbox();

        const result = yield* Operation.invoke(CrmOperation.ProcessMailbox, { mailbox: Ref.make(mailbox) });
        expect(result.processed).toBe(3);
        expect(result.contacts).toBe(2);
        expect(result.profiles).toBe(0);

        // Corporate senders became Persons linked to their Organizations; the freemail sender did not.
        const persons = yield* Database.query(Filter.type(Person.Person)).run;
        expect(persons.map((person) => person.fullName).sort()).toEqual(['Priya Adebayo', 'Saskia Volkov']);
        for (const person of persons) {
          expect(person.organization).toBeDefined();
          const organization = person.organization && (yield* Database.load(person.organization));
          expect(organization && organization.name).toBeDefined();
        }

        // Provenance recorded on the mailbox (feed messages cannot be relation endpoints), keyed by
        // the canonical feed-read message ids — the ids trigger events carry.
        const feedMessages = yield* Feed.query(yield* Database.load(mailbox.feed), Filter.type(Message.Message)).run;
        const corporate = feedMessages.filter((message) => message.sender?.email !== 'riley.nakamura@gmail.com');
        expect(corporate).toHaveLength(2);
        for (const message of corporate) {
          expect(Mailbox.getExtractedObjectIds(mailbox, message.id)).toHaveLength(1);
        }

        // Cursor advanced to the newest processed message, tagged to this operation.
        const cursors = yield* Database.query(Filter.type(Cursor.Cursor)).run;
        expect(cursors).toHaveLength(1);
        expect(Obj.getKeys(cursors[0], 'org.dxos.plugin-crm')).toHaveLength(1);
        expect(Cursor.parseKey(cursors[0].max)).toBe(Date.parse(messages[2].created));

        // Re-run: only the message at the cursor boundary is re-examined; nothing is created.
        const rerun = yield* Operation.invoke(CrmOperation.ProcessMailbox, { mailbox: Ref.make(mailbox) });
        expect(rerun.processed).toBe(1);
        expect(rerun.contacts).toBe(0);
        expect((yield* Database.query(Filter.type(Person.Person)).run).length).toBe(2);

        // A message from a new sender at a known Organization is picked up incrementally; a repeat
        // sender is deduplicated by the identity index.
        const feed = yield* Database.load(mailbox.feed);
        yield* Effect.promise(() =>
          db.appendToFeed(feed, [
            Message.make({
              created: '2026-06-04T00:00:00.000Z',
              sender: { name: 'Priya Adebayo', email: 'padebayo@ventura-advisors.example' },
              blocks: [{ _tag: 'text', text: 'Following up.' }],
            }),
            Message.make({
              created: '2026-06-05T00:00:00.000Z',
              sender: { name: 'Noor Haddad', email: 'nhaddad@silverline-partners.example' },
              blocks: [{ _tag: 'text', text: 'Introducing myself.' }],
            }),
          ]),
        );
        const incremental = yield* Operation.invoke(CrmOperation.ProcessMailbox, { mailbox: Ref.make(mailbox) });
        expect(incremental.contacts).toBe(1);
        const updated = yield* Database.query(Filter.type(Person.Person)).run;
        expect(updated.map((person) => person.fullName).sort()).toEqual([
          'Noor Haddad',
          'Priya Adebayo',
          'Saskia Volkov',
        ]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'research: true scaffolds a linked profile per new contact (feed → cursor → contact → profile)',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { mailbox } = yield* seedMailbox();

        const result = yield* Operation.invoke(CrmOperation.ProcessMailbox, {
          mailbox: Ref.make(mailbox),
          research: true,
        });
        expect(result.contacts).toBe(2);
        expect(result.profiles).toBe(2);

        const persons = yield* Database.query(Filter.type(Person.Person)).run;
        const relations = yield* Database.query(Filter.type(ProfileOf.ProfileOf)).run;
        expect(relations).toHaveLength(2);
        for (const person of persons) {
          const relation = relations.find((candidate) => Relation.getTarget(candidate)?.id === person.id);
          expect(relation).toBeDefined();
          const profile = relation && Relation.getSource(relation);
          expect(profile && Obj.instanceOf(Markdown.Document, profile)).toBe(true);
        }

        // Idempotent under repeated firing (the trigger fires once per feed item).
        const rerun = yield* Operation.invoke(CrmOperation.ProcessMailbox, {
          mailbox: Ref.make(mailbox),
          research: true,
        });
        expect(rerun.contacts).toBe(0);
        expect(rerun.profiles).toBe(0);
        expect((yield* Database.query(Filter.type(ProfileOf.ProfileOf)).run).length).toBe(2);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});

/**
 * Fixture mailbox: the three shared email fixtures with distinct timestamps, plus Organizations
 * for the two corporate domains so those senders pass the extraction allow-list (a sender earns a
 * Person only when its domain matches a known Organization; the freemail fixture does not).
 */
const seedMailbox = Effect.fnUntraced(function* () {
  const { db } = yield* Database.Service;
  const mailbox = db.add(Mailbox.make({ name: 'Inbox' }));
  const feed = yield* Database.load(mailbox.feed);
  db.add(
    Obj.make(Organization.Organization, { name: 'Ventura Advisors', website: 'https://ventura-advisors.example' }),
  );
  db.add(
    Obj.make(Organization.Organization, {
      name: 'Silverline Partners',
      website: 'https://silverline-partners.example',
    }),
  );
  const messages = EMAIL_FIXTURES.map((fixture, index) =>
    makeEmailMessage(fixture, { created: `2026-06-0${index + 1}T00:00:00.000Z` }),
  );
  yield* Effect.promise(() => db.appendToFeed(feed, messages));
  yield* Effect.promise(() => db.flush());
  return { db, mailbox, messages };
});
