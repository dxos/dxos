//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Feed, Obj, Ref, Tag } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Cursor } from '@dxos/link';
import { TagIndex } from '@dxos/schema';
import { Message } from '@dxos/types';

import { Mailbox } from '#types';

import {
  ANALYZE_CURSOR_KEY_ID,
  CLASSIFY_CURSOR_KEY_ID,
  FEED_CURSOR_KEY_SOURCE,
  findFeedCursor,
  findOrCreateAnalyzeCursor,
  findOrCreateFeedCursor,
} from './cursor';

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

  describe('analysis cursor', () => {
    /** A cursor as `AnalyzeMailbox` used to create them: on the feed, carrying no foreign key. */
    const addLegacyCursor = (db: any, mailbox: Mailbox.Mailbox) =>
      db.add(Cursor.makeFeed({ source: mailbox.feed, target: Ref.make(mailbox) }));

    test('tags the cursor it creates', async ({ expect }) => {
      const { db, mailbox } = await setup();

      const cursor = await run(db, findOrCreateAnalyzeCursor(mailbox));
      expect(Obj.getKeys(cursor, FEED_CURSOR_KEY_SOURCE).some((key) => key.id === ANALYZE_CURSOR_KEY_ID)).toBe(true);
    });

    test('adopts a legacy untagged cursor in place, preserving its position', async ({ expect }) => {
      const { db, mailbox } = await setup();

      // Creating a fresh cursor instead would re-analyze the whole feed at one LLM call per message,
      // so adoption — not just correct tagging — is what makes the change safe to ship.
      const legacy = addLegacyCursor(db, mailbox);
      Cursor.advance(legacy, Cursor.formatKey(Date.parse('2026-07-01T00:00:00.000Z')));
      await db.flush();

      const adopted = await run(db, findOrCreateAnalyzeCursor(mailbox));
      expect(adopted.id).toBe(legacy.id);
      expect(adopted.max).toBe(legacy.max);
      expect(Obj.getKeys(adopted, FEED_CURSOR_KEY_SOURCE).some((key) => key.id === ANALYZE_CURSOR_KEY_ID)).toBe(true);
    });

    test('adopts the legacy cursor only once', async ({ expect }) => {
      const { db, mailbox } = await setup();

      const legacy = addLegacyCursor(db, mailbox);
      await db.flush();

      const first = await run(db, findOrCreateAnalyzeCursor(mailbox));
      const second = await run(db, findOrCreateAnalyzeCursor(mailbox));
      expect(first.id).toBe(legacy.id);
      expect(second.id).toBe(legacy.id);
      expect(Obj.getKeys(second, FEED_CURSOR_KEY_SOURCE).length).toBe(1);
    });

    test('never adopts another consumer’s cursor', async ({ expect }) => {
      const { db, mailbox } = await setup();

      // The bug the tag exists to prevent, stated as a test: before tagging, analysis claimed
      // whichever cursor happened to be untagged, so a consumer that forgot to tag its own was
      // silently adopted and analysis resumed from that consumer's watermark.
      const classify = await run(db, findOrCreateFeedCursor(mailbox, CLASSIFY_CURSOR_KEY_ID));

      const analyze = await run(db, findOrCreateAnalyzeCursor(mailbox));
      expect(analyze.id).not.toBe(classify.id);
    });
  });
});
