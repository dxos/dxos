//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Feed, Obj, Tag } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Cursor } from '@dxos/link';
import { TagIndex } from '@dxos/schema';
import { Message } from '@dxos/types';

import { Mailbox } from '#types';

import { CLASSIFY_CURSOR_KEY_ID, FEED_CURSOR_KEY_SOURCE, findFeedCursor, findOrCreateFeedCursor } from './cursor';

/**
 * The feed-cursor helpers outlived `ProcessMailbox` (deleted 2026-08-13) because `ClassifyMailbox`
 * depends on them, so their coverage had to outlive `process-mailbox.test.ts` too. The property that
 * matters is ISOLATION: several pipelines keep a cursor on the same feed, and one adopting another's
 * position silently skips messages — the bug this tagging exists to prevent.
 */
describe('feed cursors', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db } = await builder.createDatabase({
      types: [Feed.Feed, Tag.Tag, Mailbox.Mailbox, Message.Message, TagIndex.TagIndex, Cursor.Cursor],
    });
    const mailbox = db.add(Mailbox.make());
    await db.flush();
    return { db, mailbox };
  };

  const run = <A>(db: any, effect: Effect.Effect<A, any, Database.Service>) =>
    EffectEx.runPromise(effect.pipe(Effect.provide(Database.layer(db))));

  test('creates a cursor tagged for its consumer', async ({ expect }) => {
    const { db, mailbox } = await setup();

    const cursor = await run(db, findOrCreateFeedCursor(mailbox, CLASSIFY_CURSOR_KEY_ID));
    expect(Obj.getKeys(cursor, FEED_CURSOR_KEY_SOURCE).some((key) => key.id === CLASSIFY_CURSOR_KEY_ID)).toBe(true);
  });

  test('reuses the existing cursor rather than creating a second', async ({ expect }) => {
    const { db, mailbox } = await setup();

    const first = await run(db, findOrCreateFeedCursor(mailbox, CLASSIFY_CURSOR_KEY_ID));
    const second = await run(db, findOrCreateFeedCursor(mailbox, CLASSIFY_CURSOR_KEY_ID));
    expect(second.id).toBe(first.id);
  });

  test('keeps each consumer isolated from the others on the same feed', async ({ expect }) => {
    const { db, mailbox } = await setup();

    // The regression this guards: a second pipeline adopting the first's position skips every message
    // the first already consumed.
    const classify = await run(db, findOrCreateFeedCursor(mailbox, CLASSIFY_CURSOR_KEY_ID));
    const other = await run(db, findOrCreateFeedCursor(mailbox, 'someOtherPipeline'));
    expect(other.id).not.toBe(classify.id);
  });

  test('finds nothing for a consumer that has never run', async ({ expect }) => {
    const { db, mailbox } = await setup();

    expect(await run(db, findFeedCursor(mailbox, 'neverRun'))).toBeUndefined();
  });

  test('finds only the requested consumer once several exist', async ({ expect }) => {
    const { db, mailbox } = await setup();

    const classify = await run(db, findOrCreateFeedCursor(mailbox, CLASSIFY_CURSOR_KEY_ID));
    await run(db, findOrCreateFeedCursor(mailbox, 'someOtherPipeline'));

    const found = await run(db, findFeedCursor(mailbox, CLASSIFY_CURSOR_KEY_ID));
    expect(found?.id).toBe(classify.id);
  });
});
