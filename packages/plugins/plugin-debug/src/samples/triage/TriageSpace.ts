//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Feed, Obj, Tag } from '@dxos/echo';
import { Connection } from '@dxos/link';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import * as SystemTags from '@dxos/plugin-inbox/SystemTags';
import { TagIndex } from '@dxos/schema';
import { type Actor, Message } from '@dxos/types';

import { DebugOperation } from '#types';

import { sampleMailKey } from './sample-mail.ts';

//
// An unsorted morning inbox for the triage demo: a handful of mail that asks for something, mixed in
// date order with mail that asks for nothing. Nothing is labelled, prioritised or read; triage does that.
// Spec: `CONTENT.md`.
//

/** Dated from when the space is created, so the inbox reads as this morning's mail. */
const reference = () => (process.env.NOW ? new Date(process.env.NOW) : new Date());

type EmailSeed = {
  readonly from: Actor.Actor;
  readonly subject: string;
  readonly body: string;
  /** Minutes before the space was created. */
  readonly minutesAgo: number;
};

const person = (name: string, email: string): Actor.Actor => ({ role: 'user', name, email });

export const EMAIL_SEEDS: ReadonlyArray<EmailSeed> = [
  {
    from: person('Dana Ruiz', 'dana@northwind.example'),
    subject: 'Renewal - need your written OK today',
    body: [
      'Hi Sam,',
      'Our contract lapses at midnight and legal will not let us keep using the platform without a written renewal.',
      'Can you reply today confirming we are renewing at 40 seats on the same $18 per seat price?',
      'Once I have that I can get the paperwork signed this afternoon.',
      'Thanks, Dana',
    ].join('\n\n'),
    minutesAgo: 130,
  },
  {
    from: person('Acme Weekly', 'news@acme-weekly.example'),
    subject: 'This week in product: 10 tips for faster standups',
    body: 'Ten ideas teams are using to cut their standups in half, plus our favourite links of the week. Unsubscribe at any time.',
    minutesAgo: 48,
  },
  {
    from: person('Lena Fischer', 'lena@talent.example'),
    subject: 'Interview feedback for Alex Chen',
    body: 'Hi Sam, could you submit your interview feedback for Alex Chen by tomorrow at noon? We want to make an offer decision on Friday.',
    minutesAgo: 70,
  },
  {
    from: person('Figma', 'billing@figma.example'),
    subject: 'Your receipt from Figma',
    body: 'Thanks for your payment of $45.00 for Figma Professional. No action is needed.',
    minutesAgo: 95,
  },
  {
    from: person('Priya Shah', 'priya@northwind.example'),
    subject: 'Pricing call next week?',
    body: 'Could we book 30 minutes next week to walk through the new pricing tiers? Tuesday or Wednesday afternoon works for me.',
    minutesAgo: 25,
  },
  {
    from: person('Jordan Lee', 'jordan@fieldnote.example'),
    subject: 'Team lunch Thursday',
    body: 'Booking a table for the team lunch on Thursday at noon. Are you in?',
    minutesAgo: 160,
  },
  {
    from: person('Marta Kowalski', 'marta@board.example'),
    subject: 'Board deck: slides 4-7',
    body: 'Could you review slides 4 to 7 of the board deck before Wednesday and send me your edits?',
    minutesAgo: 210,
  },
  {
    from: person('DevSummit', 'tickets@devsummit.example'),
    subject: 'Last chance: 40% off DevSummit tickets',
    body: 'Early-bird pricing ends tonight. Grab your ticket before prices go up.',
    minutesAgo: 260,
  },
  {
    from: person('Omar Haddad', 'omar@fieldnote.example'),
    subject: 'FYI: EU latency spike resolved',
    body: 'The latency spike in eu-west is resolved. The postmortem is on Friday; no action needed from you.',
    minutesAgo: 320,
  },
];

const threadIdFor = (subject: string) =>
  `thread-${subject
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()}`;

export type InboxResult = { mailbox: Mailbox.Mailbox; messages: Message.Message[] };

/** The inbox, and the local mail account its replies are delivered through. */
export const Inbox: SampleSpace.Partial<InboxResult> = SampleSpace.partial('triageInbox', {
  schemas: [Connection.Connection, Feed.Feed, Mailbox.Mailbox, Message.Message, Tag.Tag, TagIndex.TagIndex],
  run: () =>
    Effect.gen(function* () {
      const mailbox = yield* Database.add(Mailbox.make({ name: 'Inbox' }));
      const index = mailbox.tags.target;
      const feed = mailbox.feed.target;
      if (!index || !feed) {
        return yield* Effect.fail(new SampleSpace.SampleSpaceError({ context: { reason: 'mailbox-incomplete' } }));
      }

      // A sample mailbox has no account behind it; this connection is how its replies get "sent".
      yield* Database.add(
        Connection.make({
          [Obj.Meta]: { keys: [sampleMailKey(mailbox)] },
          name: 'Sample mail',
          connectorId: DebugOperation.SAMPLE_MAIL_CONNECTOR_ID,
        }),
      );

      const now = reference().getTime();
      const messages = EMAIL_SEEDS.map((seed) => {
        const threadId = threadIdFor(seed.subject);
        return Message.make({
          created: new Date(now - seed.minutesAgo * 60_000).toISOString(),
          sender: seed.from,
          blocks: [{ _tag: 'text', text: seed.body }],
          threadId,
          properties: { subject: seed.subject, threadId, to: 'sam@fieldnote.example' },
        });
      });

      yield* SampleSpace.tagBatch(
        messages.map((message) => ({ object: message, key: 'inbox' })),
        { index, resolve: (db) => SystemTags.findOrCreateSystemTag(db, 'inbox') },
      );
      yield* SampleSpace.appendToFeed(feed, messages);
      return { mailbox, messages };
    }),
});

const partials = { inbox: Inbox };

/** An unsorted inbox to triage: nine emails, four of which ask the reader for something. */
export const make = (): SampleSpace.Definition<typeof partials, void> =>
  SampleSpace.make({
    space: { name: 'Inbox triage', icon: 'office-chair', hue: 'cyan' },
    reference: reference(),
    partials,
    build: (partials) =>
      Effect.gen(function* () {
        yield* partials.inbox();
      }),
  });

export const makeTemplate = (): AppCapabilities.SpaceTemplate =>
  SampleSpace.makeTemplate({
    id: 'org.dxos.plugin-debug.template.triage',
    description: 'An unsorted morning inbox for triage: labels, priorities and tasks, then replies.',
    definition: make(),
  });
