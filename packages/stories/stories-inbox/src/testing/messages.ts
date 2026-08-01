//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Feed, Filter } from '@dxos/echo';
import { ContentBlock, Message } from '@dxos/types';

/**
 * Fresh demo messages for the `SeededFacts` story variant, so fact extraction has content without a
 * live connection. A factory (not a const) so each call yields new object instances rather than
 * re-appending already-persisted ones.
 */
export const makeDemoMessages = (): Message.Message[] => [
  Message.make({
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
