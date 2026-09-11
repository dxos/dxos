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

import * as Mailbox from './Mailbox.ts';
import * as SystemTags from './SystemTags.ts';

/**
 * Bulk labelling has to be a SET, not a flip. `toggleTag` over a batch would untag whichever members
 * already carried the tag, so a re-run would undo the previous one — which is exactly what happens
 * when a contact is created twice, or a sync labels a sender already labelled by hand.
 */
describe('applyTagToAll', () => {
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
    const messages = [
      db.add(Message.make({ sender: {}, blocks: [] })),
      db.add(Message.make({ sender: {}, blocks: [] })),
    ];
    await db.flush();
    return { db, mailbox, messages };
  };

  const run = <A>(db: any, effect: Effect.Effect<A, any, Database.Service>) =>
    EffectEx.runPromise(effect.pipe(Effect.provide(Database.layer(db))));

  test('tags every object in the batch', async ({ expect }) => {
    const { db, mailbox, messages } = await setup();

    const applied = await run(db, SystemTags.applyTagToAll(mailbox, messages, 'important'));
    expect(applied).toBe(2);
  });

  test('is idempotent — a second run changes nothing', async ({ expect }) => {
    const { db, mailbox, messages } = await setup();

    await run(db, SystemTags.applyTagToAll(mailbox, messages, 'important'));
    const second = await run(db, SystemTags.applyTagToAll(mailbox, messages, 'important'));
    // Zero newly applied, and — the point — nothing untagged.
    expect(second).toBe(0);

    const tag = await SystemTags.findOrCreateSystemTag(db, 'important');
    const tagged = SystemTags.getTaggedIds(mailbox, Obj.getURI(tag).toString());
    expect(tagged.size).toBe(2);
  });

  test('records membership in the mailbox index, not on the messages', async ({ expect }) => {
    // `Mailbox.make()` already provisions an index, so the lazy provisioning in `applyTagToAll` only
    // covers mailboxes created before the `tags` field existed. What matters here is WHERE membership
    // lands: feed messages are immutable, so it has to be the mailbox's index.
    const { db, mailbox, messages } = await setup();
    expect(mailbox.tags?.target).toBeDefined();

    await run(db, SystemTags.applyTagToAll(mailbox, messages, 'important'));

    const tag = await SystemTags.findOrCreateSystemTag(db, 'important');
    const tagged = SystemTags.getTaggedIds(mailbox, Obj.getURI(tag).toString());
    expect([...tagged].sort()).toEqual(messages.map((message) => message.id).sort());
  });

  test('does nothing for an empty batch', async ({ expect }) => {
    const { db, mailbox } = await setup();

    expect(await run(db, SystemTags.applyTagToAll(mailbox, [], 'important'))).toBe(0);
  });
});
