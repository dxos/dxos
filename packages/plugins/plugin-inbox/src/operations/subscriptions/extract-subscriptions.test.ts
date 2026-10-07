//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { Cursor } from '@dxos/link';
import { TagIndex } from '@dxos/schema';
import { Message } from '@dxos/types';

import { InboxOperationHandlerSet } from '#operations';
import { InboxOperation, Mailbox } from '#types';

const TestLayer = AssistantTestLayer({
  operationHandlers: InboxOperationHandlerSet.handlers,
  types: [Cursor.Cursor, Feed.Feed, Mailbox.Mailbox, Message.Message, TagIndex.TagIndex],
  disableLlmMemoization: true,
});

type MessageProps = {
  email: string;
  name?: string;
  listUnsubscribe?: string;
  body?: string;
};

const makeMessage = ({ email, name, listUnsubscribe, body }: MessageProps, index: number) =>
  Message.make({
    created: new Date(Date.parse('2026-07-01T00:00:00.000Z') + index * 60_000).toISOString(),
    sender: { email, name },
    blocks: [{ _tag: 'text', text: body ?? 'plain body' }],
    properties: { subject: `Message ${index}`, listUnsubscribe },
  });

const seedMailbox = Effect.fnUntraced(function* (messages: MessageProps[]) {
  const { db } = yield* Database.Service;
  const mailbox = db.add(Mailbox.make({ name: 'Inbox' }));
  const feed = yield* Database.load(mailbox.feed);
  yield* Effect.promise(() => db.appendToFeed(feed, messages.map(makeMessage)));
  yield* Effect.promise(() => db.flush());
  return { db, mailbox, feed };
});

describe('ExtractSubscriptions operation', () => {
  it.effect(
    'records header and body affordances on the mailbox, noisiest sender first',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { mailbox } = yield* seedMailbox([
          { email: 'news@bulk.io', name: 'Bulk News', listUnsubscribe: '<https://bulk.io/u>' },
          { email: 'news@bulk.io', name: 'Bulk News', listUnsubscribe: '<https://bulk.io/u>' },
          // Body-only affordance: no header, footer link.
          { email: 'promo@shop.io', name: 'Shop', body: 'Deals! https://shop.io/unsubscribe?u=42 Bye' },
          // No affordance: not a subscription.
          { email: 'alice@example.com', name: 'Alice' },
        ]);

        const result = yield* Operation.invoke(InboxOperation.ExtractSubscriptions, { mailbox: Ref.make(mailbox) });
        expect(result.scanned).toBe(4);
        expect(result.matched).toBe(3);
        expect(result.subscriptions).toBe(2);

        expect(mailbox.subscriptions?.map((subscription) => subscription.email)).toEqual([
          'news@bulk.io',
          'promo@shop.io',
        ]);
        expect(mailbox.subscriptions?.[0]).toMatchObject({ email: 'news@bulk.io', count: 2 });
        // The body-sourced affordance parses to a one-click HTTP target.
        expect(Mailbox.parseUnsubscribe(mailbox.subscriptions![1].unsubscribe)).toEqual({
          http: 'https://shop.io/unsubscribe?u=42',
        });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'reruns replace the record wholesale (idempotent, and stale entries drop out)',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { db, feed, mailbox } = yield* seedMailbox([
          { email: 'news@bulk.io', listUnsubscribe: '<https://bulk.io/u>' },
        ]);

        const first = yield* Operation.invoke(InboxOperation.ExtractSubscriptions, { mailbox: Ref.make(mailbox) });
        expect(first.subscriptions).toBe(1);

        const rerun = yield* Operation.invoke(InboxOperation.ExtractSubscriptions, { mailbox: Ref.make(mailbox) });
        expect(rerun.subscriptions).toBe(1);
        expect(mailbox.subscriptions).toHaveLength(1);
        expect(mailbox.subscriptions?.[0].count).toBe(1);

        // A new sender appears on the next run.
        yield* Effect.promise(() =>
          db.appendToFeed(feed, [makeMessage({ email: 'digest@feed.io', listUnsubscribe: '<mailto:u@feed.io>' }, 9)]),
        );
        const incremental = yield* Operation.invoke(InboxOperation.ExtractSubscriptions, {
          mailbox: Ref.make(mailbox),
        });
        expect(incremental.subscriptions).toBe(2);
        expect(mailbox.subscriptions?.map((subscription) => subscription.email).sort()).toEqual([
          'digest@feed.io',
          'news@bulk.io',
        ]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
