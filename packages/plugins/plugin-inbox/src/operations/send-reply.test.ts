//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Registry from 'effect/reactivity/AtomRegistry';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import { Database, Feed, Filter, Ref, Tag } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { TagIndex } from '@dxos/schema';
import { DraftMessage, Message } from '@dxos/types';

import { InboxOperationHandlerSet } from '#operations';
import { Mailbox } from '#types';

import handler from './send-reply.ts';

const TestLayer = AssistantTestLayer({
  operationHandlers: InboxOperationHandlerSet.handlers,
  types: [Feed.Feed, Mailbox.Mailbox, Message.Message, Tag.Tag, TagIndex.TagIndex],
});

describe('SendReply operation', () => {
  it.effect(
    'keeps the reply under the email as an unsent draft when the mailbox has no account',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { db } = yield* Database.Service;
        const mailbox = db.add(Mailbox.make({ name: 'Inbox' }));
        const feed = yield* Database.load(mailbox.feed);
        const message = Message.make({
          created: '2026-07-01T00:00:00.000Z',
          sender: { email: 'abel@example.com' },
          blocks: [{ _tag: 'text', text: 'Confirm and I will start the paperwork.' }],
          properties: { subject: 'Pricing' },
        });
        yield* Effect.promise(() => db.appendToFeed(feed, [message]));
        yield* Effect.promise(() => db.flush());

        // The handler is called directly: the send permission it declares is covered by InboxPermission.test.
        const exit = yield* handler
          .handler({ mailbox: Ref.make(mailbox), message: Ref.make(message), body: 'Confirmed, go ahead.' })
          .pipe(
            // No mail provider contributes a send operation, as in a space with no connected account.
            Effect.provideService(Capability.Service, CapabilityManager.make({ registry: Registry.make() })),
            Effect.exit,
          );
        expect(Exit.isFailure(exit)).toBe(true);
        expect(String(exit)).toContain('saved as a draft');

        const drafts = (yield* Database.query(Filter.type(Message.Message)).run).filter((candidate) =>
          DraftMessage.instanceOf(candidate),
        );
        expect(drafts).toHaveLength(1);
        expect(drafts[0].properties?.sentMessageId).toBeUndefined();
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
