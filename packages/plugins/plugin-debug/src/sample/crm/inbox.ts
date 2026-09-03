//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Feed, Obj, Tag } from '@dxos/echo';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import * as SystemTags from '@dxos/plugin-inbox/SystemTags';
import { TagIndex } from '@dxos/schema';
import { type Actor, type ContentBlock, Message } from '@dxos/types';

import { type ContactKey, contactSeed } from './accounts';
import { daysAgo } from './util';

//
// The account mail: the thread behind each pipeline stage.
//
// Deliberately small — the point is that a stage has a conversation attached, not that the mailbox
// is full. Threading is by subject: a reply reuses its root's subject, so the conversation list
// groups them without an id scheme.
//

const OWNER: Actor.Actor = { role: 'user', name: 'Priya Raman', email: 'priya@northwind-sales.example' };

type EmailSeed = {
  readonly from: ContactKey | 'owner';
  readonly subject: string;
  readonly body: string;
  /** Days before the reference date. */
  readonly daysAgo: number;
  readonly tags?: ReadonlyArray<SystemTags.SystemTagId>;
};

const EMAIL_SEEDS: ReadonlyArray<EmailSeed> = [
  {
    from: 'ruth',
    subject: 'Question from the newsletter',
    body: 'We are twelve people and drowning in spreadsheets. Is there a plan that makes sense at our size?',
    daysAgo: 12,
  },
  {
    from: 'owner',
    subject: 'Re: Question from the newsletter',
    body: 'There is — the team plan starts at ten seats. Happy to walk you through it. Are you free Thursday?',
    daysAgo: 11,
  },
  {
    from: 'mo',
    subject: 'Pilot week two',
    body: 'Eight of us are in it daily now. The import took a morning and nobody has asked me to undo it, which is high praise here.',
    daysAgo: 9,
    tags: ['important'],
  },
  {
    from: 'gil',
    subject: 'Security review — outcome',
    body: 'Review is closed with no findings. Procurement has the paperwork; expect two weeks of silence and then a PO.',
    daysAgo: 6,
    tags: ['important', 'starred'],
  },
  {
    from: 'ines',
    subject: 'Finance sign-off',
    body: 'We are a yes at 40 seats. Finance wants the invoice dated next quarter — workable?',
    daysAgo: 4,
    tags: ['starred'],
  },
  {
    from: 'owner',
    subject: 'Re: Finance sign-off',
    body: 'Workable. I will date it the first of the quarter and note the seat count on the order form.',
    daysAgo: 4,
  },
  {
    from: 'dara',
    subject: 'Adding the research arm',
    body: 'Renewal is signed. Separately: research wants in, roughly 60 more seats. Who do I talk to about pricing that?',
    daysAgo: 2,
    tags: ['important'],
  },
  {
    from: 'wes',
    subject: 'Depot rollout order',
    body: 'Dispatch is live and quiet. We would like to do the depots north-to-south rather than all at once.',
    daysAgo: 1,
  },
];

const textBlock = (text: string): ContentBlock.Text => ({ _tag: 'text', text }) satisfies ContentBlock.Text;

const senderOf = (seed: EmailSeed): Actor.Actor => {
  if (seed.from === 'owner') {
    return OWNER;
  }
  const { fullName, email } = contactSeed(seed.from);
  return { role: 'user', name: fullName, email };
};

// Strip a reply prefix so a reply lands in its root's thread.
const threadIdFor = (subject: string): string =>
  `thread-${
    subject
      .replace(/^(\s*(re|fwd?):\s*)+/i, '')
      .trim()
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'thread'
  }`;

export type InboxResult = { mailbox: Mailbox.Mailbox; messages: Message.Message[] };

/**
 * The shared sales inbox. Mail the owner sent is tagged `sent`; everything else is `inbox`, which is
 * what the mailbox's folders resolve against. Feed messages are immutable, so tag membership lives
 * in the mailbox's child `TagIndex`.
 */
export const Inbox: SampleSpace.Phase<InboxResult> = SampleSpace.phase('inbox', {
  schemas: [Mailbox.Mailbox, Message.Message, TagIndex.TagIndex, Tag.Tag, Feed.Feed],
  run: () =>
    Effect.gen(function* () {
      const mailbox = yield* Database.add(Mailbox.make({ name: 'Sales' }));
      const index = mailbox.tags.target;
      const feed = mailbox.feed.target;
      if (!index || !feed) {
        return yield* Effect.fail(new SampleSpace.SampleSpaceError({ context: { reason: 'mailbox-incomplete' } }));
      }

      const messages = EMAIL_SEEDS.map((seed) => {
        const threadId = threadIdFor(seed.subject);
        return Message.make({
          created: daysAgo(seed.daysAgo),
          sender: senderOf(seed),
          blocks: [textBlock(seed.body)],
          threadId,
          properties: { subject: seed.subject, threadId },
        });
      });

      yield* SampleSpace.tagBatch(
        messages.flatMap((message, index) => {
          const seed = EMAIL_SEEDS[index];
          const keys = [...(seed.from === 'owner' ? ['sent'] : ['inbox']), ...(seed.tags ?? [])];
          return keys.map((key) => ({ object: message, key }));
        }),
        { index, resolve: (db, key) => SystemTags.findOrCreateSystemTag(db, key as SystemTags.SystemTagId) },
      );

      Obj.update(mailbox, (mailbox) => {
        mailbox.subscriptions = Mailbox.deriveSubscriptions(messages);
      });

      yield* SampleSpace.appendToFeed(feed, messages);
      return { mailbox, messages };
    }),
});
