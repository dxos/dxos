//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Filter, Obj, Ref, Tag } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { fixtureExists, readFixture } from '@dxos/fixtures';
import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import * as InboxOperation from '@dxos/plugin-inbox/InboxOperation';
import * as InboxOperationHandlerSet from '@dxos/plugin-inbox/InboxOperationHandlerSet';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { getTaggedIds } from '@dxos/plugin-inbox/SystemTags';
import { TagIndex } from '@dxos/schema';
import { ContentBlock, Message, Person } from '@dxos/types';

/**
 * Full-corpus classification run against the pulled real mailbox fixture and the LIVE Anthropic
 * API. Deliberately double-gated — the fixture is private (absent in CI) and the run spends real
 * money — so it only executes when invoked explicitly:
 *
 * ```bash
 * DX_ANTHROPIC_API_KEY=… DX_RUN_CLASSIFY_FIXTURE=1 \
 *   pnpm --filter @dxos/stories-inbox exec vitest run --project=node src/test/classify-fixture.test.ts
 * ```
 *
 * Runs `ExtractCorrespondents` first (the Person allowlist), then `ClassifyMailbox` in batches of
 * ≤100 until the cursor reaches the head, and logs the label histogram.
 */
const FIXTURE = process.env.DX_FIXTURE_NAME ?? 'mailbox';
const ENABLED = fixtureExists(FIXTURE) && !!process.env.DX_ANTHROPIC_API_KEY && !!process.env.DX_RUN_CLASSIFY_FIXTURE;

/** The corpus owner's addresses (the `me` input for the correspondent pipeline). */
const USER_EMAILS = ['rich.burdon@gmail.com', 'rich@braneframe.com'];

type ArchivedMessage = {
  created?: string;
  sender?: { email?: string; name?: string };
  blocks?: { _tag?: string; text?: string; mimeType?: string }[];
  threadId?: string;
  properties?: Record<string, unknown>;
};

const reconstruct = (archived: ArchivedMessage): Message.Message =>
  Message.make({
    created: archived.created,
    sender: archived.sender ?? {},
    blocks: (archived.blocks ?? [])
      .filter((block) => block._tag === 'text')
      .map((block) => ContentBlock.Text.make({ text: block.text ?? '', mimeType: block.mimeType })),
    threadId: archived.threadId,
    properties: archived.properties,
  });

const TestLayer = AssistantTestLayer({
  operationHandlers: InboxOperationHandlerSet.handlers,
  types: [Cursor.Cursor, Feed.Feed, Mailbox.Mailbox, Message.Message, Person.Person, Tag.Tag, TagIndex.TagIndex],
  disableLlmMemoization: true,
});

describe.skipIf(!ENABLED)(`classify fixture: "${FIXTURE}" (live LLM, opt-in)`, () => {
  it.effect(
    'classifies the whole corpus in ≤100-message batches',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { db } = yield* Database.Service;
        const archived = readFixture<ArchivedMessage>(FIXTURE);
        const mailbox = db.add(Mailbox.make({ name: 'Fixture' }));
        const feed = yield* Database.load(mailbox.feed);
        yield* Effect.promise(() => db.appendToFeed(feed, archived.map(reconstruct)));
        yield* Effect.promise(() => db.flush());

        // Person allowlist first: correspondents become Persons, so their mail skips the model.
        const correspondents = yield* Operation.invoke(InboxOperation.ExtractCorrespondents, {
          mailbox: Ref.make(mailbox),
          me: USER_EMAILS,
        });
        log.info('classify-fixture: correspondents', correspondents);

        // Classify in bounded batches until the cursor reaches the head.
        const totals = { processed: 0, spam: 0, known: 0, batches: 0 };
        for (;;) {
          const result = yield* Operation.invoke(InboxOperation.ClassifyMailbox, {
            mailbox: Ref.make(mailbox),
            batchLimit: 100,
            strict: false,
          });
          totals.processed += result.processed;
          totals.spam += result.spam;
          totals.known += result.known;
          totals.batches += 1;
          log.info('classify-fixture: batch', { batch: totals.batches, ...result });
          expect(result.processed).toBeLessThanOrEqual(100);
          if (result.remaining === 0) {
            break;
          }
          expect(totals.batches).toBeLessThanOrEqual(10);
        }

        // Label histogram: tag label → message count.
        const tags = yield* Database.query(Filter.type(Tag.Tag)).run;
        const histogram = Object.fromEntries(
          tags
            .map((tag) => [tag.label, getTaggedIds(mailbox, Obj.getURI(tag).toString()).size] as const)
            .filter(([, count]) => count > 0)
            .sort((left, right) => right[1] - left[1]),
        );
        log.info('classify-fixture: totals', { ...totals, histogram });

        expect(totals.processed).toBe(archived.length);
        expect(totals.batches).toBe(Math.ceil(archived.length / 100));
        // The corpus owner's replied-to senders exist, so the known-person shortcut must have fired.
        expect(totals.known).toBeGreaterThan(0);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    15 * 60_000,
  );
});
