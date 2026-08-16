//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Feed, Obj, Ref, Tag } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { TagIndex } from '@dxos/schema';
import { Message } from '@dxos/types';

import { createSyncProgressKey } from '#sync';

import * as InboxOperation from './InboxOperation';
import * as Mailbox from './Mailbox';

describe('progress keys', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  /**
   * The producer (an operation, holding the mailbox from `Database.load`) and the consumer
   * (`MailboxArticle`, holding it from a space query) derive the key independently, so the key must
   * not depend on which URI form the object was hydrated with — otherwise the article subscribes to a
   * monitor name the trace sink never registered and no meter ever appears.
   */
  test('are the absolute URI, whatever form the object was hydrated with', async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [Feed.Feed, Tag.Tag, Mailbox.Mailbox, Message.Message, TagIndex.TagIndex],
    });
    const mailbox = db.add(Mailbox.make());
    await db.flush();

    // Absolute (`echo://<space>/<object>`), never relative (`echo:/<object>`).
    const absolute = Obj.getURI(mailbox, { prefer: 'absolute' }).toString();
    expect(absolute).toContain('//');
    for (const key of [
      InboxOperation.createAnalyzeProgressKey(mailbox),
      InboxOperation.createSummarizeProgressKey(mailbox),
      InboxOperation.createClassifyProgressKey(mailbox),
      InboxOperation.createFactsProgressKey(mailbox),
      InboxOperation.createCorrespondentsProgressKey(mailbox),
      InboxOperation.createSubscriptionsProgressKey(mailbox),
      createSyncProgressKey(mailbox),
    ]) {
      expect(key.startsWith(absolute)).toBe(true);
      expect(key.slice(absolute.length)).toMatch(/^#[a-z]+$/);
    }

    // Re-reading the mailbox through a ref (the operation's path) yields the same keys as the object
    // the caller already held.
    const reloaded = await EffectEx.runAndForwardErrors(
      Database.load(Ref.make(mailbox)).pipe(Effect.provide(Database.layer(db))),
    );
    expect(InboxOperation.createAnalyzeProgressKey(reloaded)).toBe(InboxOperation.createAnalyzeProgressKey(mailbox));
    expect(createSyncProgressKey(reloaded)).toBe(createSyncProgressKey(mailbox));
  });
});
