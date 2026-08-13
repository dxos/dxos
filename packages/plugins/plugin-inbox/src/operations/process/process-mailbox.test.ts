//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { Cursor } from '@dxos/link';
import { TagIndex } from '@dxos/schema';
import { Message } from '@dxos/types';

import { meta } from '#meta';
import { InboxOperationHandlerSet } from '#operations';
import { InboxOperation, Mailbox } from '#types';

import { PROCESS_CURSOR_KEY_ID, PROCESS_CURSOR_KEY_SOURCE } from './cursor';

const TestLayer = AssistantTestLayer({
  operationHandlers: InboxOperationHandlerSet,
  types: [Cursor.Cursor, Feed.Feed, Mailbox.Mailbox, Message.Message, TagIndex.TagIndex],
  disableLlmMemoization: true,
});

const makeMessage = (subject: string, created: string): Message.Message =>
  Message.make({
    created,
    sender: { name: 'Test Sender', email: 'sender@example.com' },
    blocks: [{ _tag: 'text', text: `Body of ${subject}` }],
    properties: { subject },
  });

const seedMailbox = Effect.fnUntraced(function* () {
  const { db } = yield* Database.Service;
  const mailbox = db.add(Mailbox.make({ name: 'Inbox' }));
  const feed = yield* Database.load(mailbox.feed);
  const messages = [
    makeMessage('First message', '2026-06-01T00:00:00.000Z'),
    makeMessage('Second message', '2026-06-02T00:00:00.000Z'),
    makeMessage('Third message', '2026-06-03T00:00:00.000Z'),
  ];
  yield* Effect.promise(() => db.appendToFeed(feed, messages));
  yield* Effect.promise(() => db.flush());
  return { db, mailbox, feed, messages };
});

describe('ProcessMailbox operation', () => {
  it.effect(
    'processes the feed once, resumes after the cursor, and picks up new messages',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { db, mailbox, feed, messages } = yield* seedMailbox();

        const first = yield* Operation.invoke(InboxOperation.ProcessMailbox, { mailbox: Ref.make(mailbox) });
        expect(first.processed).toBe(3);

        // Cursor persisted, tagged to this pipeline, advanced to the newest processed message.
        const cursors = yield* Database.query(Filter.type(Cursor.Cursor)).run;
        expect(cursors).toHaveLength(1);
        const keys = Obj.getKeys(cursors[0], PROCESS_CURSOR_KEY_SOURCE);
        expect(PROCESS_CURSOR_KEY_SOURCE).toBe(meta.profile.key);
        expect(keys.map((key) => key.id)).toEqual([PROCESS_CURSOR_KEY_ID]);
        expect(Cursor.parseKey(cursors[0].max)).toBe(Date.parse(messages[2].created));

        // Strictly-greater skip: a rerun with nothing new processes nothing.
        const rerun = yield* Operation.invoke(InboxOperation.ProcessMailbox, { mailbox: Ref.make(mailbox) });
        expect(rerun.processed).toBe(0);

        // Incremental: only the newly appended message is processed.
        yield* Effect.promise(() => db.appendToFeed(feed, [makeMessage('Fourth message', '2026-06-04T00:00:00.000Z')]));
        const incremental = yield* Operation.invoke(InboxOperation.ProcessMailbox, { mailbox: Ref.make(mailbox) });
        expect(incremental.processed).toBe(1);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'reset clears the cursor so the next run re-processes the whole feed',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { mailbox } = yield* seedMailbox();

        // Nothing to reset before the first run.
        const before = yield* Operation.invoke(InboxOperation.ResetProcessCursor, { mailbox: Ref.make(mailbox) });
        expect(before.reset).toBe(false);

        const first = yield* Operation.invoke(InboxOperation.ProcessMailbox, { mailbox: Ref.make(mailbox) });
        expect(first.processed).toBe(3);

        const reset = yield* Operation.invoke(InboxOperation.ResetProcessCursor, { mailbox: Ref.make(mailbox) });
        expect(reset.reset).toBe(true);
        const [cursor] = yield* Database.query(Filter.type(Cursor.Cursor)).run;
        expect(cursor.max).toBeUndefined();

        // The reset cursor object is reused (found by its tag), not recreated.
        const again = yield* Operation.invoke(InboxOperation.ProcessMailbox, { mailbox: Ref.make(mailbox) });
        expect(again.processed).toBe(3);
        expect((yield* Database.query(Filter.type(Cursor.Cursor)).run).length).toBe(1);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    "never adopts another consumer's cursor on the same feed",
    Effect.fnUntraced(
      function* ({ expect }) {
        const { db, mailbox, feed, messages } = yield* seedMailbox();

        // An untagged feed cursor (the `AnalyzeMailbox` shape) already tracking this feed.
        const foreign = db.add(
          Cursor.make({
            max: Cursor.formatKey(Date.parse(messages[2].created)),
            spec: { kind: 'feed', source: Ref.make(feed), target: Ref.make(mailbox) },
          }),
        );
        yield* Effect.promise(() => db.flush());

        // The pipeline creates its own tagged cursor and processes from position 0 — the foreign
        // cursor's advanced position must not suppress the run, and its state must stay untouched.
        const result = yield* Operation.invoke(InboxOperation.ProcessMailbox, { mailbox: Ref.make(mailbox) });
        expect(result.processed).toBe(3);
        const cursors = yield* Database.query(Filter.type(Cursor.Cursor)).run;
        expect(cursors).toHaveLength(2);
        expect(Cursor.parseKey(foreign.max)).toBe(Date.parse(messages[2].created));
        const tagged = cursors.find((cursor) => Obj.getKeys(cursor, PROCESS_CURSOR_KEY_SOURCE).length > 0);
        expect(tagged?.id).not.toBe(foreign.id);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'skips messages with a malformed created timestamp',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { db, mailbox, feed } = yield* seedMailbox();
        yield* Effect.promise(() => db.appendToFeed(feed, [makeMessage('Undated message', 'not-a-date')]));

        const result = yield* Operation.invoke(InboxOperation.ProcessMailbox, { mailbox: Ref.make(mailbox) });
        expect(result.processed).toBe(3);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
