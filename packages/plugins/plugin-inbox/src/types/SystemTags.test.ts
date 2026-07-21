//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Feed, Obj, Tag } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { TagIndex } from '@dxos/schema';
import { Message } from '@dxos/types';

import { Builder } from '../testing/builder';
import * as Mailbox from './Mailbox';
import * as SystemTags from './SystemTags';

describe('SystemTags', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('tag atom family reflects a canonical system tag membership per message', async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [Feed.Feed, Tag.Tag, Mailbox.Mailbox, Message.Message, TagIndex.TagIndex],
    });
    const mailbox = db.add(Mailbox.make());
    await db.flush();
    const feed = mailbox.feed!.target!;

    const { messages } = new Builder().createMessages(1).build();
    const [message] = messages;
    await EffectEx.runAndForwardErrors(Feed.append(feed, [message]).pipe(Effect.provide(Database.layer(db))));

    const starredTag = await SystemTags.findOrCreateSystemTag(db, 'starred');
    const starredUri = Obj.getURI(starredTag).toString();
    const toggleStar = () =>
      EffectEx.runAndForwardErrors(
        SystemTags.toggleTag(mailbox, message, 'starred').pipe(Effect.provide(Database.layer(db))),
      );
    await toggleStar();

    const starred = SystemTags.tagAtom(mailbox.tags!.target!, starredUri);
    const registry = Registry.make();
    expect(registry.get(starred(message.id))).toBe(true);

    await toggleStar();
    expect(registry.get(starred(message.id))).toBe(false);
  });

  test('setTagged applies an explicit state and is idempotent', async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [Feed.Feed, Tag.Tag, Mailbox.Mailbox, Message.Message, TagIndex.TagIndex],
    });
    const mailbox = db.add(Mailbox.make());
    await db.flush();
    const feed = mailbox.feed!.target!;

    const { messages } = new Builder().createMessages(1).build();
    const [message] = messages;
    await EffectEx.runAndForwardErrors(Feed.append(feed, [message]).pipe(Effect.provide(Database.layer(db))));

    const setStarred = (value: boolean) =>
      EffectEx.runAndForwardErrors(
        SystemTags.setTagged(mailbox, message, 'starred', value).pipe(Effect.provide(Database.layer(db))),
      );

    const starredTag = await SystemTags.findOrCreateSystemTag(db, 'starred');
    const starredUri = Obj.getURI(starredTag).toString();

    await setStarred(true);
    expect(SystemTags.getTaggedIds(mailbox, starredUri).has(message.id)).toBe(true);
    // Setting the same state again must not toggle it back off.
    await setStarred(true);
    expect(SystemTags.getTaggedIds(mailbox, starredUri).has(message.id)).toBe(true);

    await setStarred(false);
    expect(SystemTags.getTaggedIds(mailbox, starredUri).has(message.id)).toBe(false);
    await setStarred(false);
    expect(SystemTags.getTaggedIds(mailbox, starredUri).has(message.id)).toBe(false);
  });

  test('a whole thread can be starred/unstarred as a unit, even when only one member is tagged', async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [Feed.Feed, Tag.Tag, Mailbox.Mailbox, Message.Message, TagIndex.TagIndex],
    });
    const mailbox = db.add(Mailbox.make());
    await db.flush();
    const feed = mailbox.feed!.target!;

    const { messages: thread } = new Builder().createMessages(3, { threadId: 'thread-1' }).build();
    await EffectEx.runAndForwardErrors(Feed.append(feed, thread).pipe(Effect.provide(Database.layer(db))));

    const starredTag = await SystemTags.findOrCreateSystemTag(db, 'starred');
    const starredUri = Obj.getURI(starredTag).toString();

    // Only the oldest message is starred — the display must reflect ANY member, not just the latest.
    const oldest = thread.reduce((a, b) => (a.created < b.created ? a : b));
    await EffectEx.runAndForwardErrors(
      SystemTags.setTagged(mailbox, oldest, 'starred', true).pipe(Effect.provide(Database.layer(db))),
    );
    const anyStarredBefore = thread.some((message) => SystemTags.getTaggedIds(mailbox, starredUri).has(message.id));
    expect(anyStarredBefore).toBe(true);

    // Toggling the thread (this mirrors `MailboxArticle`'s `star-conversation` handler) must apply the
    // SAME target state to every member, not just the one that happened to be tagged.
    const target = !anyStarredBefore;
    await EffectEx.runAndForwardErrors(
      Effect.forEach(thread, (message) => SystemTags.setTagged(mailbox, message, 'starred', target), {
        discard: true,
      }).pipe(Effect.provide(Database.layer(db))),
    );
    for (const message of thread) {
      expect(SystemTags.getTaggedIds(mailbox, starredUri).has(message.id)).toBe(target);
    }
  });
});
