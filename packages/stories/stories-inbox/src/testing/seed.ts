//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Feed, Filter, Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { type Space } from '@dxos/react-client/echo';
import { ContentBlock, Message, Organization } from '@dxos/types';

import { importMessages } from './archive.ts';
import { TRIP_MESSAGES } from './trip.ts';

/**
 * Organizations for the demo senders' domains: the contact-extraction gate is an allow-list, so a
 * sender earns a Person only when its domain matches a known Organization.
 */
const ORGANIZATIONS = [
  {
    name: 'Sequoia Capital',
    website: 'https://sequoia.com',
  },
  {
    name: 'Globex Corporation',
    website: 'https://globex.com',
  },
  {
    name: 'Initech',
    website: 'https://initech.com',
  },
];

/**
 * Fresh demo messages for stories that need content without a live connection (fact extraction,
 * CRM pipelines). A factory (not a const) so each call yields new object instances rather than
 * re-appending already-persisted ones.
 */
export const makeDemoMessages = (): Message.Message[] => [
  Message.make({
    // `threadId` is load-bearing: the mailbox list's conversation view pulls messages through a
    // threadId semi-join (see `buildThreadSemiJoin`), so a message without one never renders.
    threadId: 'demo-thread-acme',
    sender: {
      email: 'jane@sequoia.com',
      name: 'Jane Partner',
    },
    created: '2026-07-01T09:00:00.000Z',
    blocks: [
      ContentBlock.Text.make({
        text: 'Acme Corp raised a $20M Series B led by Sequoia Capital. Jane Doe joins as CFO, reporting to CEO Mark Lee.',
      }),
    ],
    properties: {
      subject: 'Acme Series B closed',
    },
  }),
  Message.make({
    threadId: 'demo-thread-globex',
    sender: {
      email: 'bob@globex.com',
      name: 'Bob Smith',
    },
    created: '2026-07-02T14:30:00.000Z',
    blocks: [
      ContentBlock.Text.make({
        text: 'Bob Smith from Globex Corporation will present the new logistics platform at the Berlin conference next Tuesday.',
      }),
    ],
    properties: {
      subject: 'Berlin conference talk',
    },
  }),
  Message.make({
    threadId: 'demo-thread-initech',
    sender: {
      email: 'alice@initech.com',
      name: 'Alice Johnson',
    },
    created: '2026-07-03T11:15:00.000Z',
    blocks: [
      ContentBlock.Text.make({
        text: 'The merger between Initech and Umbrella Industries closes Friday. Alice Johnson is coordinating the legal review with counsel at Wayne & Co.',
      }),
    ],
    properties: {
      subject: 'Initech / Umbrella merger',
    },
  }),
  // A sender at a corporate domain with NO seeded Organization: the contact extractor creates both
  // the Person and a derived Organization (`wayne-enterprises.com` → "Wayne-enterprises"), while
  // the CRM pipeline's allow-list gate still denies the sender (unknown org, not outbound).
  Message.make({
    threadId: 'demo-thread-wayne',
    sender: {
      email: 'lucius@wayne-enterprises.com',
      name: 'Lucius Fox',
    },
    created: '2026-07-04T08:45:00.000Z',
    blocks: [
      ContentBlock.Text.make({
        text: 'Wayne Enterprises would like to explore a joint applied-sciences venture. Lucius Fox will send the term sheet this week.',
      }),
    ],
    properties: {
      subject: 'Wayne Enterprises partnership',
    },
  }),
];

/**
 * Idempotently seeds the feed with the demo messages: appends only those whose subject is not already
 * present, so repeated runs — e.g. reopening the story against persistent (OPFS) storage — never
 * duplicate them.
 */
export const seedDemoMessages = (feed: Feed.Feed): Effect.Effect<void, never, Database.Service> =>
  Effect.gen(function* () {
    const existing = yield* Feed.query(feed, Filter.type(Message.Message)).run;
    const present = new Set(existing.map((message) => message.properties?.subject));
    const missing = makeDemoMessages().filter((message) => !present.has(message.properties?.subject));
    if (missing.length > 0) {
      yield* Feed.append(feed, missing);
    }
  });

/**
 * Adds a Mailbox seeded from the pulled `@dxos/fixtures` mailbox corpus (served by the storybook
 * dev server at `/fixtures/<name>.json` — see `.storybook/main.mts`), falling back to the shared
 * demo messages when no corpus has been pulled (CI, fresh checkout). The dev server SPA-fallbacks
 * unknown paths with HTML, so gate on the content type rather than the status alone.
 */
export const seedFromFixture = async (
  space: Space,
  mailbox: Mailbox.Mailbox,
  fixture = 'mailbox',
): Promise<Mailbox.Mailbox> => {
  const response = await fetch(`/fixtures/${fixture}.json`).catch(() => undefined);
  if (response?.ok && response.headers.get('content-type')?.includes('application/json')) {
    const archived: unknown[] = await response.json();
    await importMessages(mailbox, archived, space.db);
  } else {
    const feed = await mailbox.feed.load();
    await EffectEx.runPromise(seedDemoMessages(feed).pipe(Effect.provide(Database.layer(space.db))));
  }
  await space.db.flush({ indexes: true });
  return mailbox;
};

/** Adds a Mailbox with the shared demo messages on its feed (no Organizations). */
export const seedFromMessages = async (space: Space, mailbox: Mailbox.Mailbox): Promise<Mailbox.Mailbox> => {
  const feed = await mailbox.feed.load();
  await EffectEx.runPromise(seedDemoMessages(feed).pipe(Effect.provide(Database.layer(space.db))));
  await space.db.flush({ indexes: true });
  return mailbox;
};

/** Adds a Mailbox with the shared demo messages on its feed, plus the extraction-gate Organizations. */
export const seedFromObjects = async (space: Space, mailbox: Mailbox.Mailbox): Promise<Mailbox.Mailbox> => {
  const feed = await mailbox.feed.load();
  await EffectEx.runPromise(seedDemoMessages(feed).pipe(Effect.provide(Database.layer(space.db))));
  ORGANIZATIONS.forEach((organization) => space.db.add(Obj.make(Organization.Organization, organization)));
  await space.db.flush({ indexes: true });
  return mailbox;
};

/**
 * Adds the trip fixture to the mailbox feed: two legs of one booking (same PNR) plus an unrelated
 * digest, for the auto-dispatch extraction pipeline (both legs must collapse into ONE Trip).
 */
export const seedFromTrips = async (space: Space, mailbox: Mailbox.Mailbox): Promise<Mailbox.Mailbox> => {
  await space.db.flush();
  const feed = await mailbox.feed.load();
  await space.db.appendToFeed(
    feed,
    TRIP_MESSAGES.map((message, index) =>
      Obj.make(Message.Message, {
        threadId: `trip-thread-${index}`,
        created: new Date('2026-05-25T00:00:00.000Z').toISOString(),
        sender: { email: message.from },
        properties: { subject: message.subject },
        blocks: [{ _tag: 'text', text: message.body }],
      }),
    ),
  );
  await space.db.flush({ indexes: true });
  return mailbox;
};
